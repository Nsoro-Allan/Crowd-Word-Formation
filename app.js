const wordList = [];
const canvas = document.getElementById("animationCanvas");
const ctx = canvas.getContext("2d");
let people = [];
let targetSets = [];
let currentTargetIndex = 0;
let formationCompleteTime = null;
let lastTime = null;
let duration = 5;

function updateCharCount() {
  const input = document.getElementById("wordInput");
  const charCount = document.getElementById("charCount");
  charCount.textContent = `${input.value.length}/20`;
}

function addWord() {
  const input = document.getElementById("wordInput");
  const word = input.value.trim().toUpperCase();
  if (word && word.length <= 20) {
    wordList.push(word);
    input.value = "";
    updateCharCount();
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

// Cache for text targets to avoid recalculation
const targetCache = new Map();

// Calculate optimal people count based on word complexity
function calculateOptimalPeopleCount(words) {
  let maxComplexity = 0;

  words.forEach((word) => {
    // Calculate complexity based on character count and unique characters
    const uniqueChars = new Set(word.split("")).size;
    const complexity = word.length * uniqueChars * 150; // Base multiplier for good coverage
    maxComplexity = Math.max(maxComplexity, complexity);
  });

  // Ensure minimum and maximum bounds for performance
  return Math.min(Math.max(maxComplexity, 2000), 12000);
}

function getTargets(word, peopleCount) {
  // Check cache first
  const cacheKey = `${word}_${peopleCount}`;
  if (targetCache.has(cacheKey)) {
    return targetCache.get(cacheKey);
  }

  const textCanvas = document.createElement("canvas");
  const tCtx = textCanvas.getContext("2d");
  tCtx.font = "70px Arial Black";
  const textWidth = tCtx.measureText(word).width;
  const maxWidth = tCtx.measureText("A".repeat(20)).width + 200;
  textCanvas.width = Math.max(Math.ceil(textWidth) + 200, maxWidth);
  textCanvas.height = 120;
  tCtx.fillStyle = "white";
  tCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);
  tCtx.fillStyle = "black";
  tCtx.font = "70px Arial Black";
  tCtx.textAlign = "center";
  tCtx.textBaseline = "middle";
  tCtx.fillText(word, textCanvas.width / 2, 60);

  const imageData = tCtx.getImageData(
    0,
    0,
    textCanvas.width,
    textCanvas.height
  );
  const data = imageData.data;
  const blackPixels = [];

  // Sample pixels more efficiently - skip every other pixel for performance
  for (let i = 0; i < textCanvas.width; i += 2) {
    for (let j = 0; j < textCanvas.height; j += 2) {
      const index = 4 * (j * textCanvas.width + i);
      if (data[index] < 128) {
        blackPixels.push({ i, j });
      }
    }
  }

  if (blackPixels.length === 0) {
    targetCache.set(cacheKey, []);
    return [];
  }

  const minI = Math.min(...blackPixels.map((p) => p.i));
  const maxI = Math.max(...blackPixels.map((p) => p.i));
  const minJ = Math.min(...blackPixels.map((p) => p.j));
  const maxJ = Math.max(...blackPixels.map((p) => p.j));
  const width = maxI - minI;
  const height = maxJ - minJ;
  const scaleX = 150 / width;
  const scaleY = 60 / height;
  const centerJ = (minJ + maxJ) / 2;

  const targets = [];
  for (let k = 0; k < peopleCount; k++) {
    const p = blackPixels[Math.floor(k % blackPixels.length)];
    const x = (p.i - minI) * scaleX - 75;
    const y = (p.j - centerJ) * scaleY;
    targets.push({ x, y });
  }

  // Cache the result
  targetCache.set(cacheKey, targets);
  return targets;
}

function generateAnimation() {
  if (wordList.length === 0) {
    alert("Please add at least one word!");
    return;
  }
  duration = parseInt(document.getElementById("durationInput").value) || 5;

  // Calculate optimal people count based on word complexity
  const optimalPeopleCount = calculateOptimalPeopleCount(wordList);

  // Clear cache and regenerate targets with optimal people count
  targetCache.clear();
  targetSets = wordList.map((word) => getTargets(word, optimalPeopleCount));

  people = [];
  for (let i = 0; i < optimalPeopleCount; i++) {
    const startX = Math.random() * 150 - 75;
    const startY = Math.random() * 90 - 45;
    const targets = targetSets.map((ts) =>
      ts.length > 0 ? { ...ts[i % ts.length] } : { x: 0, y: 0 }
    );
    people.push({
      pos: { x: startX, y: startY },
      targets: targets,
      speed: 35 + Math.random() * 15, // Increased speed for smoother formation
    });
  }
  currentTargetIndex = 0;
  formationCompleteTime = null;
  lastTime = null;
  requestAnimationFrame(animate);
}

// Ultra-optimized drawing with minimal operations
function drawPeople(people, scaleX, scaleY) {
  const peopleLength = people.length;

  // For large crowds, use simplified dots for better performance
  if (peopleLength > 8000) {
    ctx.fillStyle = "#ADD8E6";
    ctx.beginPath();
    for (let i = 0; i < peopleLength; i++) {
      const person = people[i];
      const screenX = (person.pos.x + 75) * scaleX;
      const screenY = (person.pos.y + 45) * scaleY;
      ctx.moveTo(screenX + 1.5, screenY);
      ctx.arc(screenX, screenY, 1.5, 0, Math.PI * 2);
    }
    ctx.fill();
  } else {
    // Full stick figures for smaller crowds
    ctx.fillStyle = "#ADD8E6";
    ctx.beginPath();
    for (let i = 0; i < peopleLength; i++) {
      const person = people[i];
      const screenX = (person.pos.x + 75) * scaleX;
      const screenY = (person.pos.y + 45) * scaleY;
      ctx.moveTo(screenX + 2, screenY);
      ctx.arc(screenX, screenY, 2, 0, Math.PI * 2);
    }
    ctx.fill();

    // Draw stick figures
    ctx.strokeStyle = "#ADD8E6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < peopleLength; i++) {
      const person = people[i];
      const x = (person.pos.x + 75) * scaleX;
      const y = (person.pos.y + 45) * scaleY;
      // Body
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x, y + 6);
      // Arms
      ctx.moveTo(x - 2, y + 4);
      ctx.lineTo(x + 2, y + 4);
      // Legs
      ctx.moveTo(x, y + 6);
      ctx.lineTo(x - 2, y + 8);
      ctx.moveTo(x, y + 6);
      ctx.lineTo(x + 2, y + 8);
    }
    ctx.stroke();
  }
}

function animate(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.025); // Smoother cap for better performance
  lastTime = timestamp;

  ctx.fillStyle = "#1a202c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let allArrived = true;

  // Optimized batch processing with early exit for performance
  const peopleLength = people.length;
  for (let i = 0; i < peopleLength; i++) {
    const person = people[i];
    const target = person.targets[currentTargetIndex];
    const dx = target.x - person.pos.x;
    const dy = target.y - person.pos.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared > 0.01) {
      allArrived = false;
      const distance = Math.sqrt(distanceSquared);
      const moveDist = Math.min(person.speed * deltaTime, distance);
      person.pos.x += (dx / distance) * moveDist;
      person.pos.y += (dy / distance) * moveDist;
    }
  }

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

  const scaleX = canvas.width / 150;
  const scaleY = canvas.height / 90;

  // Use optimized batch drawing
  drawPeople(people, scaleX, scaleY);

  requestAnimationFrame(animate);
}
