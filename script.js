let sound, fft;
let topSpans = [], bottomSpans = [];
let topStr = "MUSIC", bottomStr = "REACT";
let minWdth = 25, maxWdth = 150, baseWdth = 100;
let wavePos = 0, waveDir = 1, waveSpeed = 0.15; let waveStep = 4; // How many letters the wavehead jumps per beat
let currentTopWdths = [], currentBottomWdths = [];
let fontSize = 6;
let topYOffset = 2000;
let bottomYOffset = 800;
let bgImg;
let modes = {
  wave: true,
  bounce: false,
  scale: false,
  beatReact: false,
  waveSync: false,  // 🔥 NEW: beat-tracked wavehead
  circular: false
};
let beatThreshold = 0.35;     // Sensitivity: higher = fewer beats
let beatHold = 150;           // Min ms between beats
let lastBeatTime = 0;


const brandColors = [
  { name: "Vinyl Green", value: "#007c76" },
  { name: "Stream Green", value: "#00ff92" },
  { name: "Deep Orange", value: "#a24936" },
  { name: "Electric Orange", value: "#ff4a1c" },
  { name: "House Blue", value: "#00097b" },
  { name: "Sky Surge", value: "#71e5ff" },
  { name: "EDM Purple", value: "#893f9f" },
  { name: "Pop Pink", value: "#ff37ff" },
  { name: "Red Carpet", value: "#5a0000" },
  { name: "Hot Red", value: "#fa003f" },
];

const layouts = {
  hd: { w: 1920, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  a2: { w: 4960, h: 7016 }, // in pixels at 300dpi
  a3: { w: 3508, h: 4960 },
  a4: { w: 2480, h: 3508 }
};

function preload() {
  fft = new p5.FFT();
}

function setup() {
  noCanvas();
  let canvas = createCanvas(window.innerWidth, window.innerHeight);
canvas.id("circular-canvas");
canvas.style("position", "absolute");
canvas.style("top", "0");
canvas.style("left", "0");
canvas.style("z-index", "-1"); // behind layout
canvas.hide(); // hide until circular mode is active

  frameRate(60);
  createLayout();

  select("#play-button").mousePressed(() => {
    if (!sound?.isPlaying()) {
      sound?.play();
      select("#play-button").html("Pause Audio");
    } else {
      sound?.pause();
      select("#play-button").html("Play Audio");
    }
  });

  select("#preset").changed(() => {
    let val = select("#preset").value();
    modes.wave = val.includes("wave");
    modes.bounce = val.includes("bounce");
    modes.scale = val.includes("scale");
    modes.beatReact = select("#beat-react");
     modes.waveSync = select("#wave-sync");
    modes.circular = val === "circular";

if (modes.circular) {
    select("#layout-wrapper").hide();
    select("#circular-canvas").show();
  } else {
    select("#layout-wrapper").show();
    select("#circular-canvas").hide();
  }
});

  select("#layout").changed(applyLayout);
  select("#font-size").input(() => {
    fontSize = parseFloat(select("#font-size").value());
    applyFontSize();
  });

select("#top-y").input(() => {
  topYOffset = parseFloat(select("#top-y").value());
  applyTextOffset();
});

select("#bottom-y").input(() => {
  bottomYOffset = parseFloat(select("#bottom-y").value());
  applyTextOffset();
});


  const textColor = select("#text-color");
  const bgColor = select("#bg-color");
  brandColors.forEach(c => {
    textColor.option(c.name, c.value);
    bgColor.option(c.name, c.value);
  });

  textColor.changed(() => {
    select("#top-container").style("color", textColor.value());
    select("#bottom-container").style("color", textColor.value());
  });

 bgColor.changed(() => {
  const wrapper = select("#layout-wrapper");
  wrapper.style("background-color", bgColor.value());
  
  // Optional: only clear background image if explicitly needed
  // wrapper.style("background-image", "none");
});


  select("#bg-image").changed(() => {
    const file = select("#bg-image").elt.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      select("#layout-wrapper").style("background-image", `url(${url})`);
      select("#layout-wrapper").style("background-size", "cover");
      select("#layout-wrapper").style("background-position", "center");
    }
  });

  select("#audio-file").changed(() => {
    const file = select("#audio-file").elt.files[0];
    if (file) {
      if (sound && sound.isPlaying()) sound.stop();
      sound = loadSound(URL.createObjectURL(file));
    }
  });

  select("#update-text").mousePressed(() => {
    topStr = select("#top-text").value().toUpperCase() || topStr;
    bottomStr = select("#bottom-text").value().toUpperCase() || bottomStr;
    createLayout();
  });

  select("#show-grid").changed(() => {
    const show = select("#show-grid").elt.checked;
    select("#grid-overlay").style("display", show ? "block" : "none");
  });

  window.addEventListener("resize", scaleLayoutWrapper);
}

function createLayout() {
  topSpans = [];
  bottomSpans = [];
  currentTopWdths = [];
  currentBottomWdths = [];

  select("#top-container").html('');
  select("#bottom-container").html('');

  for (let i = 0; i < topStr.length; i++) {
    let span = createSpan(topStr[i]).parent("top-container");
    span.class("char");
    topSpans.push(span);
    currentTopWdths.push(baseWdth);
  }

  for (let i = 0; i < bottomStr.length; i++) {
    let span = createSpan(bottomStr[i]).parent("bottom-container");
    span.class("char");
    bottomSpans.push(span);
    currentBottomWdths.push(baseWdth);
  }

  applyLayout();
}

function applyLayout() {
  const layoutKey = select("#layout").value();
  const { w, h } = layouts[layoutKey];
  const wrapper = select("#layout-wrapper");
  wrapper.style("width", `${w}px`);
  wrapper.style("height", `${h}px`);
  applyFontSize();
  applyTextOffset();
  drawGrid(w, h);
  scaleLayoutWrapper();
}

function applyFontSize() {
  const layoutKey = select("#layout").value();
  let layoutScale = 1;

  // Scale down print layouts to visually match digital ones
  if (layoutKey === "a2") layoutScale = 0.25;
  else if (layoutKey === "a3") layoutScale = 0.33;
  else if (layoutKey === "a4") layoutScale = 0.5;

  const scaledFontSize = fontSize / layoutScale;

  select("#top-container").style("font-size", `${scaledFontSize}rem`);
  select("#bottom-container").style("font-size", `${scaledFontSize}rem`);
}


function applyTextOffset() {
  select("#top-container").style("transform", `translateY(${topYOffset}px)`);
  select("#bottom-container").style("transform", `translateY(${bottomYOffset}px)`);
}


function scaleLayoutWrapper() {
  const wrapper = select("#layout-wrapper").elt;
  const layoutW = wrapper.offsetWidth;
  const layoutH = wrapper.offsetHeight;
  const scale = Math.min(
    window.innerWidth / layoutW,
    window.innerHeight / layoutH,
    1
  );
  wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
}


function draw() {

function draw() {
  if (!sound || !sound.isPlaying()) return;

  if (modes.circular) {
    clear();
    background("#000");
    drawCircularText(topStr.toUpperCase(), 5);
    return;
  }

  // regular wave animation logic continues...
}


function draw() {
  if (!sound || !sound.isPlaying()) return;

  if (modes.circular) {
    clear(); // if using canvas
    background("#000"); // or whatever your bg logic is
    drawCircularText(topStr.toUpperCase(), 5);
    return;
  }

  // existing wave/bounce/scale logic below...
}



  if (!sound || !sound.isPlaying()) return;

  let spectrum = fft.analyze();
  wavePos += waveDir * waveSpeed;
  let maxLen = Math.max(topSpans.length, bottomSpans.length);
  if (wavePos > maxLen - 1 || wavePos < 0) {
    waveDir *= -1;
    wavePos = constrain(wavePos, 0, maxLen - 1);
  }

  if (modes.waveSync && vol > beatThreshold && now - lastBeatTime > beatHold) {
  lastBeatTime = now;
  wavePos += waveDir * waveStep;
  if (wavePos >= maxLen - 1 || wavePos <= 0) {
    waveDir *= -1;
    wavePos = constrain(wavePos, 0, maxLen - 1);
  }
}


let vol = fft.getEnergy("lowMid") / 255;
let now = millis();

let isBeat = false;
if (modes.beatReact && vol > beatThreshold && now - lastBeatTime > beatHold) {
  isBeat = true;
  lastBeatTime = now;
}

animateSpans(topSpans, currentTopWdths, wavePos, spectrum, isBeat);
animateSpans(bottomSpans, currentBottomWdths, wavePos, spectrum, isBeat);

}

function animateSpans(spans, wdths, wavePos, spectrum, isBeat) {

  let targetWdths = [];

  for (let i = 0; i < spans.length; i++) {
    let dist = abs(i - wavePos);
    let falloff = pow(cos((dist / spans.length) * PI), 2);
    let band = floor(map(i, 0, spans.length, 20, 180));
    let energy = spectrum[band] / 255;
    let influence = energy * falloff;
    targetWdths[i] = map(influence, 0, 1, minWdth, maxWdth);
  }

  for (let i = 0; i < spans.length; i++) {
    wdths[i] = lerp(wdths[i], targetWdths[i], 0.2);
  }

  let totalTarget = baseWdth * spans.length;
  let rawSum = wdths.reduce((a, b) => a + b, 0);
  let scaleFactor = totalTarget / rawSum;
  let scaledWdths = wdths.map(w => w * scaleFactor);

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const width = scaledWdths[i];
    const influence = (width - minWdth) / (maxWdth - minWdth);
    span.style("font-variation-settings", `"wdth" ${modes.wave ? width.toFixed(1) : baseWdth}`);

    let transforms = [];
    if (modes.bounce) transforms.push(`translateY(${map(influence, 0, 1, 0, -20)}px)`);
    if (modes.scale) transforms.push(`scale(${map(influence, 0, 1, 1, 1.3)})`);
    if (modes.beatReact && isBeat) {
  transforms.push(`scale(1.3)`);
  transforms.push(`translateY(-12px)`);
}


    span.style("transform", transforms.join(" "));
    span.style("margin-right", `${map(width, minWdth, maxWdth, -5, 2)}px`);
  }
  
}

function drawCircularText(textStr, ringCount = 5) {
  translate(width / 2, height / 2);
  textAlign(CENTER, CENTER);
  textFont("nickel-gothic-variable");

  let spectrum = fft.analyze();
  let amp = fft.getEnergy('mid');

  for (let i = 0; i < ringCount; i++) {
    push();
    rotate(i * 15);
    let radius = 80 + i * 60;
    let textSizePx = 20 + i * 4;
    let pulse = map(amp, 0, 255, -4, 20);
    let radiusPulse = radius + pulse;

    let chars = textStr + " ";
    let angleStep = 360 / chars.length;

    for (let j = 0; j < chars.length; j++) {
      let angle = j * angleStep;
      let x = cos(angle) * radiusPulse;
      let y = sin(angle) * radiusPulse;
      push();
      translate(x, y);
      rotate(angle + 90);
      textSize(textSizePx);
      fill("#ffffff");
      noStroke();
      text(chars[j], 0, 0);
      pop();
    }
    pop();
  }
}



function drawGrid(w, h) {
  const overlay = select("#grid-overlay");
  overlay.html('');
  overlay.style("display", "block");
  overlay.style("position", "absolute");
  overlay.style("top", "0");
  overlay.style("left", "0");
  overlay.style("width", `${w}px`);
  overlay.style("height", `${h}px`);

let layoutKey = select("#layout").value();
let layoutScale = 1;
if (layoutKey === "a2") layoutScale = 0.25;
else if (layoutKey === "a3") layoutScale = 0.33;
else if (layoutKey === "a4") layoutScale = 0.5;

// Use larger base margins and gutters to appear proportional
const baseMargin = 40;  // Use 40px as visual base
const baseGutter = 20;

const marginLeft = baseMargin / layoutScale;
const marginRight = baseMargin / layoutScale;
const marginTop = baseMargin / layoutScale;
const marginBottom = baseMargin / layoutScale;
const gutter = baseGutter / layoutScale;

const colWidth = (w - marginLeft - marginRight - 2 * gutter) / 3;


  // 🔳 Column lines (3-column grid)
  for (let i = 0; i < 3; i++) {
    const x = marginLeft + i * (colWidth + gutter);
    const colLine = createDiv('').parent(overlay);
    colLine.style("position", "absolute");
    colLine.style("top", "0");
    colLine.style("left", `${x}px`);
    colLine.style("width", "1px");
    colLine.style("height", "100%");
    colLine.style("background", "rgba(255, 0, 128, 0.6)");
  }

  // 🟪 Horizontal 2/3 guide
  const guide = createDiv('').parent(overlay);
  guide.style("position", "absolute");
  guide.style("top", `${(h * 2) / 3}px`);
  guide.style("left", "0");
  guide.style("width", "100%");
  guide.style("height", "1px");
  guide.style("background", "rgba(255, 0, 128, 0.6)");

  // 🔲 Margin lines and zones
  drawMargins({ marginLeft, marginRight, marginTop, marginBottom }, w, h);
  drawMarginZones(marginLeft, marginRight, marginTop, marginBottom, w, h);
}

function drawMargins(margins, w, h) {
  const { marginLeft, marginRight, marginTop, marginBottom } = margins;
  const overlay = select("#grid-overlay");

  const createLine = (pos, val, horizontal = false) => {
    const line = createDiv('').parent(overlay);
    line.style("position", "absolute");

    if (horizontal) {
      line.style("top", `${val}px`);
      line.style("left", "0");
      line.style("width", "100%");
      line.style("height", "1px");
    } else {
      line.style("left", `${val}px`);
      line.style("top", "0");
      line.style("width", "1px");
      line.style("height", "100%");
    }

    line.style("background", "rgb(0, 234, 255)");
  };

  createLine("left", marginLeft);
  createLine("right", w - marginRight - 1); // ensure inside edge
  createLine("top", marginTop, true);
  createLine("bottom", h - marginBottom - 1, true);
}

function drawMarginZones(marginLeft, marginRight, marginTop, marginBottom, w, h) {
  const overlay = select("#grid-overlay");

  const createZone = (x, y, width, height) => {
    const zone = createDiv('').parent(overlay);
    zone.style("position", "absolute");
    zone.style("left", `${x}px`);
    zone.style("top", `${y}px`);
    zone.style("width", `${width}px`);
    zone.style("height", `${height}px`);
    zone.style("background", "rgba(255, 255, 255, 0.5)");
  };

  // Vertical margins
  createZone(0, 0, marginLeft, h);                    // Left
  createZone(w - marginRight, 0, marginRight, h);     // Right

  // Horizontal margins
  createZone(0, 0, w, marginTop);                     // Top
  createZone(0, h - marginBottom, w, marginBottom);   // Bottom
}
















































