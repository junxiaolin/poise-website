(() => {
  if (!('IntersectionObserver' in window)) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const groups = [...document.querySelectorAll('.overview-video, .video-pair')].map(element => {
    const videos = [...element.querySelectorAll('video')];
    const sources = videos.map(video => video.querySelector('source'));
    return {
      element, videos, sources, urls: sources.map(source => source.getAttribute('src')),
      visible: false, nearby: false, loaded: false, playing: false, starting: false,
      userPaused: false, manualPlayback: false, blocked: false, buffering: false,
      savedTime: 0, generation: 0,
      ignoredPauses: new WeakSet(), ignoredSeeks: new WeakSet()
    };
  });

  function load(group) {
    if (group.loaded) return;
    group.loaded = true;
    group.videos.forEach((video, index) => {
      group.sources[index].setAttribute('src', group.urls[index]);
      video.preload = 'metadata';
      video.load();
    });
  }

  function pause(group) {
    group.generation += 1;
    group.playing = false;
    group.starting = false;
    group.videos.forEach(video => {
      if (!video.paused) {
        group.ignoredPauses.add(video);
        video.pause();
      }
    });
  }

  function seek(group, video, time) {
    if (!Number.isFinite(video.duration)) return;
    const target = Math.min(time, Math.max(0, video.duration - 0.05));
    if (Math.abs(video.currentTime - target) > 0.08) {
      group.ignoredSeeks.add(video);
      video.currentTime = target;
    }
  }

  function unload(group) {
    if (!group.loaded) return;
    group.savedTime = group.videos[0].currentTime;
    pause(group);
    group.loaded = false;
    group.buffering = false;
    group.sources.forEach(source => source.removeAttribute('src'));
    group.videos.forEach(video => {
      video.preload = 'none';
      video.load();
    });
  }

  function mayPlay(group) {
    const fullscreen = document.fullscreenElement;
    const inView = fullscreen ? group.element.contains(fullscreen) : group.visible;
    return !document.hidden && inView && !group.userPaused && !group.blocked;
  }

  async function start(group) {
    if (!mayPlay(group) || group.starting || group.playing) return;
    load(group);
    group.videos.forEach(video => { video.preload = 'auto'; });
    // Both views must be ready before either view starts.
    if (group.videos.some(video => video.readyState < 3 || video.seeking)) return;
    const generation = ++group.generation;
    group.starting = true;
    group.buffering = false;
    const time = group.videos[0].currentTime;
    group.videos.slice(1).forEach(video => seek(group, video, time));
    try {
      await Promise.all(group.videos.map(video => video.play()));
      if (generation !== group.generation || !mayPlay(group)) return;
      group.starting = false;
      group.playing = true;
    } catch (error) {
      if (generation !== group.generation) return;
      // Keep native controls usable when the browser declines autoplay.
      group.blocked = error.name !== 'AbortError';
      pause(group);
    }
  }

  function resumeAutomatically(group) {
    if (!reducedMotion.matches || group.manualPlayback) void start(group);
  }

  groups.forEach(group => {
    group.videos.forEach(video => {
      video.muted = true;
      video.playsInline = true;
      video.addEventListener('loadedmetadata', () => seek(group, video, group.savedTime));
      video.addEventListener('canplay', () => resumeAutomatically(group));
      video.addEventListener('play', () => {
        if (group.starting || group.playing) return;
        // Native play resumes the entire pair, including after a manual pause.
        group.userPaused = false;
        group.manualPlayback = true;
        group.blocked = false;
        group.visible = true;
        pause(group);
        void start(group);
      });
      video.addEventListener('pause', () => {
        if (group.ignoredPauses.has(video)) {
          group.ignoredPauses.delete(video);
          return;
        }
        if (!video.paused || video.ended || video.seeking || group.buffering) return;
        if (group.playing || group.starting) {
          group.userPaused = true;
          pause(group);
        }
      });
      video.addEventListener('seeking', () => {
        if (group.ignoredSeeks.has(video)) {
          group.ignoredSeeks.delete(video);
          return;
        }
        // Scrubbing either timeline moves both views to the same time.
        group.savedTime = video.currentTime;
        group.videos.filter(other => other !== video).forEach(other => seek(group, other, video.currentTime));
      });
      video.addEventListener('seeked', () => resumeAutomatically(group));
      video.addEventListener('ratechange', () => {
        group.videos.forEach(other => {
          if (other.playbackRate !== video.playbackRate) other.playbackRate = video.playbackRate;
        });
      });
      video.addEventListener('waiting', () => {
        if (!group.playing || video.seeking) return;
        group.buffering = true;
        pause(group);
      });
      video.addEventListener('ended', () => {
        pause(group);
        group.savedTime = 0;
        group.videos.forEach(other => seek(group, other, 0));
        resumeAutomatically(group);
      });
      video.addEventListener('error', () => {
        group.blocked = true;
        pause(group);
      });
    });
  });

  const byElement = new Map(groups.map(group => [group.element, group]));
  // Warm up nearby rows; release distant decoders and stop their downloads.
  const preloadObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const group = byElement.get(entry.target);
      group.nearby = entry.isIntersecting;
      if (group.nearby) load(group);
      else if (!group.visible && !group.element.contains(document.fullscreenElement)) unload(group);
    });
  }, { rootMargin: '400px 0px' });

  const playbackObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const group = byElement.get(entry.target);
      // Account for a large overview video on a short landscape viewport.
      const requiredHeight = Math.min(entry.boundingClientRect.height * 0.3,
        Math.max(80, (window.innerHeight - 64) * 0.5));
      const visible = entry.isIntersecting && entry.intersectionRect.height >= requiredHeight;
      if (visible !== group.visible) {
        group.visible = visible;
        if (visible) resumeAutomatically(group);
        else if (!group.element.contains(document.fullscreenElement)) {
          pause(group);
          if (!group.nearby) unload(group);
        }
      }
    });
  }, { rootMargin: '-64px 0px 0px', threshold: Array.from({ length: 21 }, (_, i) => i / 20) });

  groups.forEach(group => {
    preloadObserver.observe(group.element);
    playbackObserver.observe(group.element);
  });

  // Correct occasional drift without changing either video's playback speed.
  window.setInterval(() => {
    groups.filter(group => group.playing && group.videos.length > 1).forEach(group => {
      const [leader, follower] = group.videos;
      if (!leader.seeking && !follower.seeking && Math.abs(leader.currentTime - follower.currentTime) > 0.3) {
        seek(group, follower, leader.currentTime);
      }
    });
  }, 500);

  document.addEventListener('visibilitychange', () => {
    groups.forEach(group => {
      if (document.hidden) pause(group);
      else resumeAutomatically(group);
    });
  });
  document.addEventListener('fullscreenchange', () => {
    groups.forEach(group => {
      if (!mayPlay(group)) pause(group);
      else resumeAutomatically(group);
    });
  });
  reducedMotion.addEventListener('change', () => {
    groups.forEach(group => {
      if (reducedMotion.matches) {
        group.manualPlayback = false;
        pause(group);
      }
      else resumeAutomatically(group);
    });
  });
})();
