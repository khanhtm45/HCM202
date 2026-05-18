/** Render ảnh / video YouTube / audio cho timeline, hiện vật, khu tư tưởng */
function renderMediaBlock(media) {
  if (!media) return '';
  const credit = media.credit
    ? `<p class="media-credit">${media.credit}</p>`
    : '';
  const cap = media.caption
    ? `<figcaption>${media.caption}</figcaption>`
    : '';

  if (media.type === 'image' && (media.url || media.local)) {
    const src = media.local || media.url;
    return `<figure class="media-figure">
      <img src="${src}" alt="${media.caption || ''}" loading="lazy" />
      ${cap}${credit}
    </figure>`;
  }

  if (media.type === 'video' && media.youtube) {
    return `<figure class="media-figure media-video">
      <div class="video-wrap">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${media.youtube}?rel=0"
          title="${media.caption || 'Video'}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
      ${cap}${credit}
    </figure>`;
  }

  if (media.type === 'video' && media.url) {
    return `<figure class="media-figure media-video">
      <video controls playsinline preload="metadata" src="${media.url}"></video>
      ${cap}${credit}
    </figure>`;
  }

  if (media.type === 'audio' && media.youtube) {
    return `<figure class="media-figure media-video">
      <div class="video-wrap">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${media.youtube}?rel=0"
          title="${media.caption || 'Audio'}"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
      ${cap}${credit}
    </figure>`;
  }

  if (media.type === 'audio' && media.url) {
    return `<figure class="media-figure">
      <audio controls src="${media.url}"></audio>
      ${cap}${credit}
    </figure>`;
  }

  return '';
}
