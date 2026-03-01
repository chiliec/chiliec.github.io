---
title: Proactive Patient Command Center
date: 2026-03-02
layout: empty
---
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Patient Command Center</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { background: #0f172a; }
  .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); }
  .fade-in { animation: fadeIn 0.4s ease forwards; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .pulse { animation: pulse 1.2s infinite; }
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
</style>
</head>
<body class="text-white font-sans">

<div class="min-h-screen flex flex-col items-center p-6 gap-6">

  <div class="w-full max-w-3xl glass rounded-3xl p-6 shadow-2xl">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold">Command Center</h1>
        <p class="text-sm text-gray-400">You are fully in control</p>
      </div>
      <div id="sla" class="text-sm bg-blue-600 px-3 py-1 rounded-full pulse">Reply ≤ <span id="timer">15:00</span></div>
    </div>
  </div>

  <div class="w-full max-w-3xl glass rounded-3xl p-6 shadow-xl">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-medium">Current Visit</h2>
      <span id="visitStatus" class="px-3 py-1 rounded-full bg-yellow-500 text-black text-xs fade-in">Preparing</span>
    </div>
    <div class="w-full bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
      <div id="progressBar" class="bg-green-500 h-2 rounded-full transition-all duration-700" style="width: 30%"></div>
    </div>
    <div class="flex gap-3">
      <button onclick="advanceStatus()" class="flex-1 bg-green-600 hover:bg-green-500 rounded-xl p-2">Advance Status</button>
      <button onclick="uploadPhoto()" class="flex-1 bg-gray-800 hover:bg-gray-700 rounded-xl p-2">Upload Photo</button>
    </div>
  </div>

  <div class="w-full max-w-3xl glass rounded-3xl p-6 shadow-xl">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-medium">Next Action</h2>
      <span class="text-xs text-gray-400">Optimal Window</span>
    </div>
    <p id="nextAction" class="text-gray-300 fade-in">Doctor reviewing your pre-treatment photos.</p>
    <button onclick="completeAction()" class="mt-4 w-full bg-blue-600 hover:bg-blue-500 rounded-xl p-2">Acknowledge</button>
  </div>

  <div class="w-full max-w-3xl glass rounded-3xl p-6 shadow-xl">
    <h2 class="text-lg font-medium mb-4">Communication Mode</h2>
    <div class="flex gap-3">
      <button onclick="setMode('Ultra Fast')" class="flex-1 bg-red-600 hover:bg-red-500 rounded-xl p-2">Ultra Fast</button>
      <button onclick="setMode('Executive Summary')" class="flex-1 bg-yellow-600 hover:bg-yellow-500 rounded-xl p-2">Executive</button>
      <button onclick="setMode('Silent')" class="flex-1 bg-gray-800 hover:bg-gray-700 rounded-xl p-2">Silent</button>
    </div>
    <p id="modeStatus" class="mt-3 text-sm text-gray-400">Current: Ultra Fast</p>
  </div>

</div>

<script>
let statusStages = ["Preparing", "Doctor Reviewing", "Plan Updated", "Completed"];
let progressValues = [30, 55, 80, 100];
let currentStage = 0;

function advanceStatus() {
  if (currentStage < statusStages.length - 1) {
    currentStage++;
    let statusEl = document.getElementById("visitStatus");
    statusEl.classList.remove("fade-in");
    void statusEl.offsetWidth;
    statusEl.textContent = statusStages[currentStage];
    statusEl.classList.add("fade-in");
    document.getElementById("progressBar").style.width = progressValues[currentStage] + "%";
  }
}

function uploadPhoto() {
  alert("Photo uploaded. Doctor notified instantly.");
}

function completeAction() {
  let actionEl = document.getElementById("nextAction");
  actionEl.classList.remove("fade-in");
  void actionEl.offsetWidth;
  actionEl.textContent = "Action acknowledged. Awaiting next update.";
  actionEl.classList.add("fade-in");
}

function setMode(mode) {
  document.getElementById("modeStatus").textContent = "Current: " + mode;
  if (mode === "Silent") {
    document.getElementById("sla").innerHTML = "Updates Batched";
  } else if (mode === "Executive Summary") {
    document.getElementById("sla").innerHTML = "Daily Digest";
  } else {
    document.getElementById("sla").innerHTML = "Reply ≤ <span id='timer'>15:00</span>";
    startTimer(15 * 60);
  }
}

// Real-time SLA countdown
let countdown;
function startTimer(duration) {
  clearInterval(countdown);
  let timer = duration;
  countdown = setInterval(function () {
    let minutes = parseInt(timer / 60, 10);
    let seconds = parseInt(timer % 60, 10);
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;
    let timerEl = document.getElementById("timer");
    if (timerEl) timerEl.textContent = minutes + ":" + seconds;
    if (--timer < 0) {
      clearInterval(countdown);
      document.getElementById("sla").classList.remove("bg-blue-600");
      document.getElementById("sla").classList.add("bg-red-600");
      document.getElementById("sla").innerHTML = "Escalated";
    }
  }, 1000);
}

startTimer(15 * 60);
</script>

</body>
</html>
