const wordList = [];
const canvas = document.getElementById("animationCanvas");
const ctx = canvas.getContext("2d");
const NUM_PEOPLE = 5000;
let people = [];
let targetSets = [];
let currentTargetIndex = 0;
let formationCompleteTime = null;
let lastTime = null;
let duration = 5;

function addWord() {
  const input = document.getElementById("wordInput");
  const word = input.value.trim().toUpperCase();
  if (word && word.length <= 20) {
    wordList.push(word);
    input.value = "";
    updateWordListUI();
  }
}

function removeWord(index) {
  wordList.splice(index, 1);
  updateWordListUI();
}

function updateWordListUI() {
  const list = document.getElementById("wordList");
  list.innerHTML = "";
  wordList.forEach((word, index) => {
    const li = document.createElement("li");
    li.textContent = word;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => removeWord(index);
    li.appendChild(removeBtn);
    list.appendChild(li);
  });
}

function getTargets(word) {
  const textCanvas = document.createElement("canvas");
  const tCtx = textCanvas.getContext("2d");
  tCtx.font = "60px Arial Black";
  const textWidth = tCtx.measureText(word).width;
  textCanvas.width = Math.ceil(textWidth) + 50;
  textCanvas.height = 100;
  tCtx.fillStyle = "white";
  tCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);
  tCtx.fillStyle = "black";
  tCtx.font = "60px Arial Black";
  tCtx.textAlign = "center";
  tCtx.textBaseline = "middle";
  tCtx.fillText(word, textCanvas.width / 2, 50);

  const imageData = tCtx.getImageData(0, 0, textCanvas.width, 100);
  const data = imageData.data;
  const blackPixels = [];

  for (let i = 0; i < textCanvas.width; i += 1) {
    for (let j = 0; j < 100; j += 1) {
      const index = 4 * (j * textCanvas.width + i);
      if (data[index] < 128) {
        blackPixels.push({ i, j });
      }
    }
  }

  if (blackPixels.length === 0) return [];

  const minI = Math.min(...blackPixels.map((p) => p.i));
  const maxI = Math.max(...blackPixels.map((p) => p.i));
  const minJ = Math.min(...blackPixels.map((p) => p.j));
  const maxJ = Math.max(...blackPixels.map((p) => p.j));
  const width = maxI - minI;
  const scale = 100 / width;
  const centerJ = (minJ + maxJ) / 2;

  const targets = [];
  for (let k = 0; k < NUM_PEOPLE; k++) {
    const p = blackPixels[Math.floor(Math.random() * blackPixels.length)];
    const x = (p.i - minI) * scale - 50;
    const y = (p.j - centerJ) * scale;
    targets.push({ x, y });
  }
  return targets;
}

function generateAnimation() {
  if (wordList.length === 0) {
    alert("Please add at least one word!");
    return;
  }
  duration = parseInt(document.getElementById("durationInput").value) || 5;
  targetSets = wordList.map((word) => getTargets(word));
  people = [];
  for (let i = 0; i < NUM_PEOPLE; i++) {
    const startX = Math.random() * 120 - 60;
    const startY = Math.random() * 90 - 45;
    const targets = targetSets.map((ts) =>
      ts.length > 0 ? { ...ts[i % ts.length] } : { x: 0, y: 0 }
    );
    people.push({
      pos: { x: startX, y: startY },
      targets: targets,
      speed: 30,
    });
  }
  currentTargetIndex = 0;
  formationCompleteTime = null;
  lastTime = null;
  requestAnimationFrame(animate);
}

function drawPerson(x, y) {
  ctx.fillStyle = "#ADD8E6";
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ADD8E6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x, y + 6);
  ctx.moveTo(x - 2, y + 4);
  ctx.lineTo(x + 2, y + 4);
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x - 2, y + 8);
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x + 2, y + 8);
  ctx.stroke();
}

function animate(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  ctx.fillStyle = "#1a202c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let allArrived = true;
  people.forEach((person) => {
    const target = person.targets[currentTargetIndex];
    const dx = target.x - person.pos.x;
    const dy = target.y - person.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0.1) {
      allArrived = false;
      const moveDist = Math.min(person.speed * deltaTime, distance);
      person.pos.x += (dx / distance) * moveDist;
      person.pos.y += (dy / distance) * moveDist;
    }
  });

  if (allArrived) {
    if (!formationCompleteTime) {
      formationCompleteTime = timestamp;
    } else if ((timestamp - formationCompleteTime) / 1000 >= duration) {
      currentTargetIndex = (currentTargetIndex + 1) % targetSets.length;
      formationCompleteTime = null;
    }
  } else {
    formationCompleteTime = null;
  }

  const scaleX = canvas.width / 120;
  const scaleY = canvas.height / 90;
  people.forEach((person) => {
    const screenX = (person.pos.x + 60) * scaleX;
    const screenY = (person.pos.y + 45) * scaleY;
    drawPerson(screenX, screenY);
  });

  requestAnimationFrame(animate);
}
