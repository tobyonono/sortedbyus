// Applies a "Sort flash" document to the open Cavalry scene (Sorted-by-Us-Film-studio.cv).
// Run inside Cavalry: define BRAND and DATA, paste this file, then call
// applySortFlash(DATA, BRAND, { assetDir, render: { dir, name } }).
// Layers are found by name: lead, suffix, closer, overlay, word N, photo N.
// Colours are brand palette names only; anything else is refused.

function applySortFlash(data, brand, opts) {
  opts = opts || {};
  var comp = api.getActiveComp();
  var all = api.getAllSceneLayers();
  var byName = {};
  for (var i = 0; i < all.length; i++) byName[api.getNiceName(all[i])] = all[i];
  function layer(n) {
    if (!byName[n]) throw new Error("Template layer missing: " + n);
    return byName[n];
  }
  function colour(name) {
    var hex = brand.palette[name];
    if (!hex) throw new Error("Not a brand colour: " + name);
    return hex;
  }

  // Set a layer's visible range. Cavalry ignores an in-point that is later
  // than the current out-point (and vice versa), so open the range wide
  // first, then trim. setOutFrame takes the last visible frame.
  function span(id, first, last) {
    api.setOutFrame(id, Math.max(last, api.getOutFrame(id), first + 1));
    api.setInFrame(id, first);
    api.setOutFrame(id, last);
  }

  var fps = data.fps || 25;
  var size = brand.formats[data.format || "portrait"].video;
  var beat = Math.max(1, Math.round(data.beatSeconds * fps));
  var hold = Math.max(1, Math.round(data.endSeconds * fps));
  var maxBeats = 9;
  var beats = data.beats.slice(0, maxBeats);
  var n = beats.length;
  var landAt = n * beat;
  var end = landAt + hold - 1;

  // Composition: size, rate, length, background.
  api.set(comp, {
    resolution: size,
    fps: fps,
    startFrame: 0,
    endFrame: end,
    playbackStart: 0,
    playbackEnd: end,
    backgroundColor: colour(data.colours.background),
  });

  // Palette slots: 0 background, 1 + 2 text, 3 photo tint. The scene palette
  // isn't listed as a scene layer, so find it through the lead's colour input.
  var pal = api.getInConnection(layer("lead"), "material.materialColor").split(".")[0];
  api.set(pal, {
    "array.0": colour(data.colours.background),
    "array.1": colour(data.colours.text),
    "array.2": colour(data.colours.text),
    "array.3": colour(data.colours.overlay),
  });

  // Copy.
  api.set(layer("lead"), { text: data.lead });
  api.set(layer("suffix"), { text: data.suffix });
  api.set(layer("closer"), { text: data.closer });

  // Beats: word + photo per slot; unused slots are hidden.
  for (var b = 1; b <= maxBeats; b++) {
    var word = layer("word " + b);
    var photo = layer("photo " + b);
    var used = b <= n;
    api.set(word, { hidden: !used });
    api.set(photo, { hidden: !used, "generator.dimensions": size });
    if (!used) continue;
    var start = (b - 1) * beat;
    span(word, start, start + beat - 1);
    span(photo, start, start + beat - 1);
    api.set(word, { text: beats[b - 1].word });
    if (beats[b - 1].image && opts.assetDir) {
      var shader = api.getInConnection(photo, "material.colorShaders.0.shader").split(".")[0];
      var asset = api.getInConnection(shader, "image").split(".")[0];
      var path = opts.assetDir + "/" + beats[b - 1].image;
      if (api.getAssetFilePath(asset) !== path) api.replaceAsset(asset, path);
    }
  }

  // Overlay sits over the photos until the land; the land holds to the end.
  var overlay = layer("overlay");
  api.set(overlay, { opacity: data.overlayOpacity, "generator.dimensions": size });
  span(overlay, 0, landAt - 1);
  span(layer("lead"), 0, end);
  span(layer("suffix"), landAt, end);
  span(layer("closer"), landAt, end);

  var result = { frames: end + 1, seconds: (end + 1) / fps, size: size, fps: fps, beats: n };

  if (opts.render) {
    var rq = api.getRenderQueueItems()[0] || api.addRenderQueueItem(comp);
    api.set(rq, {
      filePath: opts.render.dir,
      fileName: opts.render.name,
      frameRange: [0, end],
    });
    api.render(rq);
    result.rendered = opts.render.dir + "/" + opts.render.name;
  }
  return result;
}
