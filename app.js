const tabs = document.querySelectorAll(".bottom-nav button");
const screens = document.querySelectorAll(".screen");

const runStatus = document.querySelector("[data-run-status]");
const statusDot = document.querySelector("[data-status-dot]");
const runHint = document.querySelector("[data-run-hint]");
const elapsedValue = document.querySelector("[data-elapsed]");
const distanceValue = document.querySelector("[data-distance]");
const paceValue = document.querySelector("[data-pace]");
const caloriesValue = document.querySelector("[data-calories]");
const gpsValue = document.querySelector("[data-gps]");
const gpsDetail = document.querySelector("[data-gps-detail]");
const gpsTestButton = document.querySelector("[data-gps-test]");
const startButton = document.querySelector("[data-action='start']");
const pauseButton = document.querySelector("[data-action='pause']");
const finishButton = document.querySelector("[data-action='finish']");
const recordEmpty = document.querySelector("[data-record-empty]");
const recordList = document.querySelector("[data-record-list]");
const monthDistanceValue = document.querySelector("[data-month-distance]");
const monthCountValue = document.querySelector("[data-month-count]");
const averagePaceValue = document.querySelector("[data-average-pace]");
const goalTextValue = document.querySelector("[data-goal-text]");
const goalProgressValue = document.querySelector("[data-goal-progress]");
const calendarTitle = document.querySelector("[data-calendar-title]");
const calendarGrid = document.querySelector("[data-calendar-grid]");
const calendarPrevButton = document.querySelector("[data-calendar-prev]");
const calendarNextButton = document.querySelector("[data-calendar-next]");
const dayDetail = document.querySelector("[data-day-detail]");
const dayDetailTitle = document.querySelector("[data-day-detail-title]");
const dayDetailSummary = document.querySelector("[data-day-detail-summary]");
const dayRecordList = document.querySelector("[data-day-record-list]");
const liveMapElement = document.querySelector("[data-live-map]");
const liveMapPlaceholder = document.querySelector("[data-live-map-placeholder]");
const liveMapStatus = document.querySelector("[data-live-map-status]");
const recordMapPanel = document.querySelector("[data-record-map-panel]");
const recordMapElement = document.querySelector("[data-record-map]");
const recordMapStatus = document.querySelector("[data-record-map-status]");
const mediaUrlInput = document.querySelector("[data-media-url]");
const mediaFileInput = document.querySelector("[data-media-file]");
const mediaConnectButton = document.querySelector("[data-media-connect]");
const mediaPlayButton = document.querySelector("[data-media-play]");
const mediaStopButton = document.querySelector("[data-media-stop]");
const mediaStatus = document.querySelector("[data-media-status]");
const mediaAudio = document.querySelector("[data-media-audio]");
const mediaVideo = document.querySelector("[data-media-video]");
const mediaFrameWrap = document.querySelector("[data-media-frame-wrap]");
const mediaFrame = document.querySelector("[data-media-frame]");
const voiceToggle = document.querySelector("[data-voice-toggle]");
const voiceToggleLabel = document.querySelector("[data-voice-toggle-label]");
const voiceStatus = document.querySelector("[data-voice-status]");
const voiceTestButton = document.querySelector("[data-voice-test]");
const installButton = document.querySelector("[data-install-button]");
const installPanel = document.querySelector("[data-install-panel]");
const installAction = document.querySelector("[data-install-action]");
const installMessage = document.querySelector("[data-install-message]");
const updatePanel = document.querySelector("[data-update-panel]");
const updateAction = document.querySelector("[data-update-action]");
const updateMessage = document.querySelector("[data-update-message]");
const appVersionMeta = document.querySelector("[data-app-version]");

const APP_VERSION = "v1.1.2";
const APP_UPDATED_AT = "2026.06.07";
const STORAGE_KEY = "running-web-records";
const MEDIA_STORAGE_KEY = "running-web-media";
const MONTH_GOAL_KM = 50;
const VOICE_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_CHECK_MS = 30 * 60 * 1000;
const GPS_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 30000,
};
const GPS_RETRY_MS = 2500;
const STALE_POSITION_MS = 2 * 60 * 1000;
const MAX_DISTANCE_ACCURACY_METERS = 35;
const MAX_RUNNING_SPEED_MPS = 8;
let records = loadRecords();
let calendarDate = new Date();
let selectedDateKey = getDateKey(new Date());
let liveRouteMap = null;
let recordRouteMap = null;
let connectedMedia = null;
let mediaObjectUrl = null;
let shouldPlaySavedMediaOnTap = false;
let deferredInstallPrompt = null;
let waitingServiceWorker = null;
let isRefreshingForUpdate = false;

const runState = {
  status: "idle",
  runStartedAt: null,
  startedAt: 0,
  elapsedBeforePause: 0,
  timerId: null,
  gpsWatchId: null,
  gpsRetryId: null,
  gpsStatus: "idle",
  gpsPermission: "unknown",
  gpsMessage: "",
  lastGpsError: "",
  lastGpsAt: null,
  rawPosition: null,
  lastPosition: null,
  livePosition: null,
  distanceMeters: 0,
  routePoints: [],
  lastVoiceAnnouncementMs: 0,
  wakeLock: null,
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetId = tab.dataset.target;

    tabs.forEach((item) => item.classList.remove("is-active"));
    screens.forEach((screen) => screen.classList.remove("is-active"));

    tab.classList.add("is-active");
    document.getElementById(targetId)?.classList.add("is-active");
    window.setTimeout(() => {
      liveRouteMap?.map.invalidateSize();
      recordRouteMap?.map.invalidateSize();
    }, 0);
  });
});

startButton?.addEventListener("click", startRun);
pauseButton?.addEventListener("click", togglePause);
finishButton?.addEventListener("click", finishRun);
calendarPrevButton?.addEventListener("click", () => changeCalendarMonth(-1));
calendarNextButton?.addEventListener("click", () => changeCalendarMonth(1));
mediaConnectButton?.addEventListener("click", connectMedia);
mediaPlayButton?.addEventListener("click", playMedia);
mediaStopButton?.addEventListener("click", () => stopMedia(true));
document.addEventListener("pointerdown", playSavedMediaFromScreenTap, { passive: true });
voiceToggle?.addEventListener("change", renderVoiceState);
voiceTestButton?.addEventListener("click", () => announceRunProgress(true));
gpsTestButton?.addEventListener("click", handleGpsButton);
installButton?.addEventListener("click", installApp);
installAction?.addEventListener("click", installApp);
updateAction?.addEventListener("click", applyAppUpdate);
window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
window.addEventListener("appinstalled", handleAppInstalled);
document.addEventListener("visibilitychange", handleVisibilityChange);

registerServiceWorker();
watchGpsPermission();
renderRun();
renderRecords();
renderStats();
updateLiveMap();
renderVoiceState();
renderInstallState();
renderAppVersion();
loadSavedMedia();

function startRun() {
  stopTimer();
  stopGps();

  runState.status = "running";
  runState.runStartedAt = new Date().toISOString();
  runState.startedAt = Date.now();
  runState.elapsedBeforePause = 0;
  runState.distanceMeters = 0;
  runState.routePoints = [];
  runState.lastPosition = null;
  runState.livePosition = null;
  runState.rawPosition = null;
  runState.gpsStatus = "requesting";
  runState.gpsMessage = "현재 위치를 찾는 중입니다.";
  runState.lastGpsError = "";
  runState.lastGpsAt = null;
  runState.lastVoiceAnnouncementMs = 0;

  startTimer();
  startGps();
  requestRunWakeLock();
  renderRun();
  updateLiveMap();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isRefreshingForUpdate) return;
    isRefreshingForUpdate = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");
      watchForAppUpdate(registration);
      checkForAppUpdate(registration);
      window.setInterval(() => checkForAppUpdate(registration), UPDATE_CHECK_MS);
    } catch {
      if (installMessage) {
        installMessage.textContent = "설치 준비 중 오류가 있어 다시 새로고침해보세요.";
      }
    }
  });
}

function renderAppVersion() {
  if (appVersionMeta) {
    appVersionMeta.textContent = `${APP_VERSION} · ${APP_UPDATED_AT} 업데이트`;
  }
}

function watchForAppUpdate(registration) {
  if (registration.waiting && navigator.serviceWorker.controller) {
    showAppUpdate(registration.waiting);
  }

  registration.addEventListener("updatefound", () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
        showAppUpdate(newWorker);
      }
    });
  });
}

function checkForAppUpdate(registration) {
  if (typeof registration.update !== "function") return;
  registration.update().catch(() => {});
}

function showAppUpdate(worker) {
  waitingServiceWorker = worker;
  if (updateAction) updateAction.disabled = false;
  if (updateMessage) {
    updateMessage.textContent = "버튼을 누르면 최신 파일을 적용하고 다시 열립니다.";
  }
  if (updatePanel) updatePanel.hidden = false;
}

function applyAppUpdate() {
  if (updateAction) updateAction.disabled = true;
  if (updateMessage) {
    updateMessage.textContent = "최신 버전으로 바꾸는 중입니다.";
  }

  if (waitingServiceWorker) {
    waitingServiceWorker.postMessage({ type: "SKIP_WAITING" });
    window.setTimeout(() => window.location.reload(), 3000);
    return;
  }

  window.location.reload();
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  renderInstallState();
}

function handleAppInstalled() {
  deferredInstallPrompt = null;
  if (installPanel) installPanel.hidden = true;
  if (installButton) installButton.hidden = true;
}

function renderInstallState() {
  const isInstalled = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  if (isInstalled) {
    if (installPanel) installPanel.hidden = true;
    if (installButton) installButton.hidden = true;
    return;
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (installPanel) {
    installPanel.hidden = false;
  }

  if (installButton) {
    installButton.hidden = false;
  }

  if (installAction) {
    installAction.hidden = isIos || !deferredInstallPrompt;
  }

  if (installMessage) {
    installMessage.textContent = isIos
      ? "Safari 공유 버튼에서 홈 화면에 추가를 누르면 설치됩니다."
      : deferredInstallPrompt
        ? "설치 버튼을 누르면 홈 화면에 앱처럼 추가됩니다."
        : "브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하세요.";
  }
}

async function installApp() {
  if (!deferredInstallPrompt) {
    renderInstallState();
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  renderInstallState();
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible" && runState.status === "running") {
    requestRunWakeLock();
  }
}

async function requestRunWakeLock() {
  if (runState.status !== "running" || runState.wakeLock || !navigator.wakeLock) return;

  try {
    runState.wakeLock = await navigator.wakeLock.request("screen");
    runState.wakeLock.addEventListener("release", () => {
      runState.wakeLock = null;
    });
  } catch {
    runState.wakeLock = null;
  }
}

function releaseRunWakeLock() {
  const wakeLock = runState.wakeLock;
  runState.wakeLock = null;
  wakeLock?.release?.().catch(() => {});
}

function togglePause() {
  if (runState.status === "running") {
    runState.elapsedBeforePause = getElapsedMs();
    runState.status = "paused";
    runState.lastPosition = null;
    runState.livePosition = null;
    stopTimer();
    stopGps();
    stopVoice();
    releaseRunWakeLock();
    renderRun();
    updateLiveMap();
    return;
  }

  if (runState.status === "paused") {
    runState.startedAt = Date.now();
    runState.status = "running";
    runState.lastPosition = null;
    runState.livePosition = null;
    runState.rawPosition = null;
    runState.gpsStatus = "requesting";
    runState.gpsMessage = "현재 위치를 다시 찾는 중입니다.";
    runState.lastGpsError = "";
    startTimer();
    startGps();
    requestRunWakeLock();
    renderRun();
    updateLiveMap();
  }
}

function finishRun() {
  if (runState.status === "running") {
    runState.elapsedBeforePause = getElapsedMs();
  }

  saveCurrentRun();
  runState.status = "finished";
  runState.lastPosition = null;
  runState.livePosition = null;
  stopTimer();
  stopGps();
  stopVoice();
  releaseRunWakeLock();
  renderRun();
  renderRecords();
  renderStats();
  updateLiveMap();
}

function startTimer() {
  stopTimer();
  runState.timerId = window.setInterval(renderRun, 250);
}

function stopTimer() {
  if (!runState.timerId) return;
  window.clearInterval(runState.timerId);
  runState.timerId = null;
}

function startGps() {
  if (!("geolocation" in navigator)) {
    runState.gpsStatus = "unsupported";
    runState.gpsMessage = "이 브라우저에서는 GPS를 사용할 수 없습니다.";
    renderRun();
    return;
  }

  clearGpsRetry();
  clearGpsWatch();
  runState.gpsStatus = "requesting";
  runState.gpsMessage = "현재 위치를 찾는 중입니다.";
  renderRun();
  updateLiveMap();

  const requestStartedAt = Date.now();
  navigator.geolocation.getCurrentPosition(
    (position) => handlePosition(position, { trackDistance: true }),
    (error) => handleGpsError(error, { canRetry: false, requestStartedAt }),
    GPS_OPTIONS
  );

  runState.gpsWatchId = navigator.geolocation.watchPosition(
    handlePosition,
    handleGpsError,
    GPS_OPTIONS
  );
}

function stopGps() {
  clearGpsRetry();
  clearGpsWatch();
}

function clearGpsWatch() {
  if (runState.gpsWatchId === null) return;
  navigator.geolocation.clearWatch(runState.gpsWatchId);
  runState.gpsWatchId = null;
}

function clearGpsRetry() {
  if (runState.gpsRetryId === null) return;
  window.clearTimeout(runState.gpsRetryId);
  runState.gpsRetryId = null;
}

function scheduleGpsRetry() {
  if (runState.status !== "running" || runState.gpsRetryId !== null) return;

  runState.gpsRetryId = window.setTimeout(() => {
    runState.gpsRetryId = null;
    if (runState.status === "running") {
      startGps();
    }
  }, GPS_RETRY_MS);
}

function handlePosition(position, options = {}) {
  const currentPosition = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
  };

  if (!isValidPosition(currentPosition)) {
    runState.gpsStatus = "error";
    runState.gpsMessage = "폰에서 받은 위치값이 올바르지 않습니다.";
    renderRun();
    updateLiveMap();
    return;
  }

  if (isStalePosition(currentPosition)) {
    runState.gpsStatus = "stale";
    runState.gpsMessage = "폰이 오래된 위치를 보내서 무시했습니다. GPS를 다시 연결해보세요.";
    renderRun();
    updateLiveMap();
    return;
  }

  clearGpsRetry();
  runState.rawPosition = currentPosition;
  runState.lastGpsAt = Date.now();
  runState.lastGpsError = "";

  if (!isAccurateEnoughForDistance(currentPosition)) {
    runState.gpsStatus = "weak";
    runState.gpsMessage = getGpsIgnoredMessage(currentPosition);
    renderRun();
    updateLiveMap();
    return;
  }

  runState.livePosition = currentPosition;
  runState.gpsStatus = currentPosition.accuracy <= 35 ? "ready" : "weak";
  runState.gpsMessage = getGpsFixMessage(currentPosition);

  const shouldTrackDistance = options.trackDistance !== false && runState.status === "running";

  if (!shouldTrackDistance) {
    renderRun();
    updateLiveMap();
    return;
  }

  if (!runState.lastPosition) {
    runState.routePoints.push(createRoutePoint(currentPosition));
    runState.lastPosition = currentPosition;
  } else {
    const movedMeters = getDistanceMeters(runState.lastPosition, currentPosition);

    if (isUsefulMovement(movedMeters, currentPosition, runState.lastPosition)) {
      runState.distanceMeters += movedMeters;
      runState.routePoints.push(createRoutePoint(currentPosition));
      runState.lastPosition = currentPosition;
    }
  }

  renderRun();
  updateLiveMap();
}

function handleGpsError(error, options = {}) {
  const canRetry = options.canRetry !== false;

  if (!canRetry && options.requestStartedAt && runState.lastGpsAt >= options.requestStartedAt) {
    return;
  }

  runState.lastPosition = null;
  runState.lastGpsError = getGpsErrorMessage(error);

  if (error.code === error.PERMISSION_DENIED || error.code === 1) {
    runState.gpsStatus = "denied";
    runState.gpsPermission = "denied";
  } else if (error.code === error.POSITION_UNAVAILABLE || error.code === 2) {
    runState.gpsStatus = "unavailable";
  } else if (error.code === error.TIMEOUT || error.code === 3) {
    runState.gpsStatus = "timeout";
  } else {
    runState.gpsStatus = "error";
  }

  runState.gpsMessage = getGpsErrorHint(runState.gpsStatus);

  if (canRetry && (runState.gpsStatus === "timeout" || runState.gpsStatus === "unavailable")) {
    clearGpsWatch();
    scheduleGpsRetry();
  }

  renderRun();
  updateLiveMap();
}

function getElapsedMs() {
  if (runState.status === "running") {
    return runState.elapsedBeforePause + Date.now() - runState.startedAt;
  }

  return runState.elapsedBeforePause;
}

function renderRun() {
  const elapsedMs = getElapsedMs();
  const isIdle = runState.status === "idle";
  const isRunning = runState.status === "running";
  const isPaused = runState.status === "paused";
  const isFinished = runState.status === "finished";
  const distanceKm = runState.distanceMeters / 1000;

  if (elapsedValue) elapsedValue.textContent = formatDuration(elapsedMs);
  if (distanceValue) distanceValue.textContent = `${distanceKm.toFixed(2)} km`;
  if (paceValue) paceValue.textContent = formatPace(elapsedMs, distanceKm);
  if (caloriesValue) caloriesValue.textContent = `${Math.round(distanceKm * 60)} kcal`;

  if (runStatus) {
    runStatus.textContent = {
      idle: "준비 완료",
      running: "기록 중",
      paused: "일시정지",
      finished: "러닝 완료",
    }[runState.status];
  }

  if (runHint) {
    runHint.textContent = getRunHint();
  }

  if (gpsValue) {
    gpsValue.textContent = getGpsLabel();
  }

  renderGpsDetail();
  renderLiveMapPlaceholder();
  checkVoiceAnnouncement(elapsedMs);

  if (startButton) {
    startButton.disabled = isRunning || isPaused;
    startButton.textContent = isFinished ? "새 러닝 시작" : "시작";
  }

  if (pauseButton) {
    pauseButton.disabled = isIdle || isFinished;
    pauseButton.textContent = isPaused ? "재개" : "일시정지";
  }

  if (finishButton) {
    finishButton.disabled = isIdle || isFinished;
  }

  statusDot?.classList.toggle("is-running", isRunning);
  statusDot?.classList.toggle("is-paused", isPaused);
  statusDot?.classList.toggle("is-finished", isFinished);
  statusDot?.setAttribute(
    "aria-label",
    isRunning ? "기록 중" : isPaused ? "일시정지" : isFinished ? "완료" : "준비"
  );
}

function renderGpsDetail() {
  if (gpsDetail) {
    gpsDetail.textContent = getGpsDetail();
  }

  if (gpsTestButton) {
    gpsTestButton.textContent = runState.status === "running" ? "GPS 다시 연결" : "현재 위치 확인";
  }
}

function renderLiveMapPlaceholder() {
  if (!liveMapPlaceholder) return;

  const message = getLiveMapPlaceholderMessage();
  liveMapPlaceholder.hidden = message === "";
  liveMapPlaceholder.textContent = message;
}

function handleGpsButton() {
  if (runState.status === "running") {
    runState.lastPosition = null;
    runState.livePosition = null;
    runState.rawPosition = null;
    startGps();
    return;
  }

  requestSingleGpsFix();
}

function requestSingleGpsFix() {
  if (!("geolocation" in navigator)) {
    runState.gpsStatus = "unsupported";
    runState.gpsMessage = "이 브라우저에서는 GPS를 사용할 수 없습니다.";
    renderRun();
    updateLiveMap();
    return;
  }

  runState.gpsStatus = "requesting";
  runState.gpsMessage = "현재 위치 권한과 좌표를 확인하는 중입니다.";
  runState.lastGpsError = "";
  runState.livePosition = null;
  runState.rawPosition = null;
  renderRun();
  updateLiveMap();

  const requestStartedAt = Date.now();
  navigator.geolocation.getCurrentPosition(
    (position) => handlePosition(position, { trackDistance: false }),
    (error) => handleGpsError(error, { canRetry: false, requestStartedAt }),
    GPS_OPTIONS
  );
}

async function watchGpsPermission() {
  if (!navigator.permissions?.query) return;

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    runState.gpsPermission = permission.state;
    renderRun();

    const handlePermissionChange = () => {
      runState.gpsPermission = permission.state;
      renderRun();
    };

    if (typeof permission.addEventListener === "function") {
      permission.addEventListener("change", handlePermissionChange);
    } else {
      permission.onchange = handlePermissionChange;
    }
  } catch {
    runState.gpsPermission = "unknown";
  }
}

function saveCurrentRun() {
  const elapsedMs = getElapsedMs();
  const distanceKm = runState.distanceMeters / 1000;
  const record = {
    id: createRecordId(),
    startedAt: runState.runStartedAt || new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    elapsedMs,
    distanceMeters: runState.distanceMeters,
    pace: formatPace(elapsedMs, distanceKm),
    calories: Math.round(distanceKm * 60),
    route: runState.routePoints,
  };

  records = [record, ...records].slice(0, 100);
  saveRecords(records);
  calendarDate = new Date(record.finishedAt);
  selectedDateKey = getDateKey(record.finishedAt);
}

function renderRecords() {
  if (!recordList) return;

  recordList.innerHTML = "";
  recordList.classList.toggle("is-empty", records.length === 0);

  if (recordEmpty) {
    recordEmpty.hidden = records.length > 0;
  }

  records.forEach((record) => {
    const item = document.createElement("article");
    const summary = document.createElement("div");
    const title = document.createElement("strong");
    const details = document.createElement("span");
    const viewButton = document.createElement("button");
    const distanceKm = record.distanceMeters / 1000;

    title.textContent = formatRecordDate(record.finishedAt);
    details.textContent = `${distanceKm.toFixed(2)} km · ${formatDuration(record.elapsedMs)} · ${record.pace}`;
    viewButton.type = "button";
    viewButton.textContent = "보기";
    viewButton.addEventListener("click", () => selectRecordDate(record));

    summary.append(title, details);
    item.append(summary, viewButton);
    recordList.append(item);
  });

  renderCalendar();
  renderDayDetail();
}

function renderStats() {
  const now = new Date();
  const monthRecords = records.filter((record) => {
    const finishedAt = new Date(record.finishedAt);
    return finishedAt.getFullYear() === now.getFullYear() && finishedAt.getMonth() === now.getMonth();
  });
  const totalMeters = monthRecords.reduce((total, record) => total + record.distanceMeters, 0);
  const totalElapsedMs = monthRecords.reduce((total, record) => total + record.elapsedMs, 0);
  const totalKm = totalMeters / 1000;
  const goalPercent = Math.min((totalKm / MONTH_GOAL_KM) * 100, 100);

  if (monthDistanceValue) monthDistanceValue.textContent = `${totalKm.toFixed(1)} km`;
  if (monthCountValue) monthCountValue.textContent = `${monthRecords.length}회`;
  if (averagePaceValue) averagePaceValue.textContent = formatPace(totalElapsedMs, totalKm);
  if (goalTextValue) goalTextValue.textContent = `${totalKm.toFixed(1)} / ${MONTH_GOAL_KM} km`;
  if (goalProgressValue) goalProgressValue.style.width = `${goalPercent}%`;
}

function renderCalendar() {
  if (!calendarGrid || !calendarTitle) return;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = getDateKey(new Date());

  calendarTitle.textContent = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(calendarDate);
  calendarGrid.innerHTML = "";

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    const blank = document.createElement("div");
    blank.className = "calendar-day is-blank";
    calendarGrid.append(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = getDateKey(date);
    const dayRecords = getRecordsForDateKey(dateKey);
    const totalKm = getTotalKm(dayRecords);
    const hasRun = dayRecords.length > 0;
    const dayButton = document.createElement("button");
    const dayNumber = document.createElement("strong");
    const status = document.createElement("span");
    const distance = document.createElement("small");

    dayButton.type = "button";
    dayButton.className = "calendar-day";
    dayButton.classList.toggle("has-run", hasRun);
    dayButton.classList.toggle("is-today", dateKey === todayKey);
    dayButton.classList.toggle("is-selected", dateKey === selectedDateKey);
    dayButton.setAttribute("aria-label", `${day}일 ${hasRun ? `${totalKm.toFixed(2)} km 완료` : "러닝 안함"}`);
    dayButton.addEventListener("click", () => {
      selectedDateKey = dateKey;
      renderCalendar();
      renderDayDetail();
    });

    dayNumber.textContent = String(day);
    status.textContent = hasRun ? "완료" : "안함";
    distance.textContent = hasRun ? `${totalKm.toFixed(1)} km` : "-";

    dayButton.append(dayNumber, status, distance);
    calendarGrid.append(dayButton);
  }
}

function renderDayDetail() {
  if (!dayDetail || !dayDetailTitle || !dayDetailSummary || !dayRecordList) return;

  const dayRecords = getRecordsForDateKey(selectedDateKey);
  const totalKm = getTotalKm(dayRecords);
  const totalElapsedMs = dayRecords.reduce((total, record) => total + record.elapsedMs, 0);

  dayDetail.hidden = false;
  dayDetailTitle.textContent = formatDateKeyTitle(selectedDateKey);
  dayDetailSummary.textContent =
    dayRecords.length > 0
      ? `${dayRecords.length}회 · ${totalKm.toFixed(2)} km · ${formatDuration(totalElapsedMs)} · 평균 ${formatPace(totalElapsedMs, totalKm)}`
      : "러닝 안함 · 0.00 km";
  dayRecordList.innerHTML = "";

  if (dayRecords.length === 0) {
    const empty = document.createElement("p");
    empty.className = "day-record-empty";
    empty.textContent = "이날은 아직 저장된 러닝이 없습니다.";
    dayRecordList.append(empty);
    renderRecordMap([]);
    return;
  }

  dayRecords.forEach((record) => {
    const item = document.createElement("article");
    const distanceKm = record.distanceMeters / 1000;
    const title = document.createElement("strong");
    const details = document.createElement("span");

    title.textContent = formatRecordTime(record.finishedAt);
    details.textContent = `${distanceKm.toFixed(2)} km · ${formatDuration(record.elapsedMs)} · ${record.pace} · ${record.calories} kcal`;
    item.append(title, details);
    dayRecordList.append(item);
  });

  renderRecordMap(dayRecords);
}

function updateLiveMap() {
  if (liveMapStatus) {
    liveMapStatus.textContent = getLiveMapLabel();
  }

  renderLiveMapPlaceholder();

  if (!liveMapElement) return;

  if (!canUseMap()) {
    if (liveMapStatus) liveMapStatus.textContent = "지도 로드 실패";
    return;
  }

  if (!liveRouteMap) {
    liveRouteMap = createRouteMap(liveMapElement);
  }

  drawRoute(liveRouteMap, runState.routePoints.length > 0 ? runState.routePoints : getLiveRouteFallback());
}

function renderRecordMap(dayRecords) {
  if (!recordMapPanel || !recordMapElement) return;

  if (dayRecords.length === 0) {
    recordMapPanel.hidden = true;
    return;
  }

  recordMapPanel.hidden = false;

  if (!canUseMap()) {
    if (recordMapStatus) recordMapStatus.textContent = "지도 로드 실패";
    return;
  }

  if (!recordRouteMap) {
    recordRouteMap = createRouteMap(recordMapElement);
  }

  const recordWithRoute = dayRecords.find((record) => Array.isArray(record.route) && record.route.length > 0);

  if (!recordWithRoute) {
    if (recordMapStatus) recordMapStatus.textContent = "GPS 경로 없음";
    drawRoute(recordRouteMap, []);
    return;
  }

  if (recordMapStatus) {
    recordMapStatus.textContent = `${recordWithRoute.route.length}개 위치`;
  }

  drawRoute(recordRouteMap, recordWithRoute.route);
}

function getLiveRouteFallback() {
  return runState.livePosition ? [createRoutePoint(runState.livePosition)] : [];
}

function createRouteMap(element) {
  const Leaflet = window.L;
  const map = Leaflet.map(element, {
    attributionControl: true,
    zoomControl: false,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
  }).setView([37.5665, 126.978], 16);

  Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    detectRetina: true,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
  Leaflet.control.zoom({ position: "bottomright" }).addTo(map);

  return {
    map,
    polyline: Leaflet.polyline([], {
      color: "#0f766e",
      opacity: 0.92,
      weight: 5,
    }).addTo(map),
    startMarker: null,
    endMarker: null,
    accuracyCircle: null,
  };
}

function drawRoute(routeMap, routePoints) {
  if (!routeMap) return;

  const Leaflet = window.L;
  const latLngs = routePoints.map((point) => [point.latitude, point.longitude]);
  routeMap.polyline.setLatLngs(latLngs);

  if (routeMap.startMarker) {
    routeMap.startMarker.remove();
    routeMap.startMarker = null;
  }

  if (routeMap.endMarker) {
    routeMap.endMarker.remove();
    routeMap.endMarker = null;
  }

  if (routeMap.accuracyCircle) {
    routeMap.accuracyCircle.remove();
    routeMap.accuracyCircle = null;
  }

  if (latLngs.length === 0) {
    routeMap.map.setView([37.5665, 126.978], 16);
  } else if (latLngs.length === 1) {
    routeMap.map.setView(latLngs[0], 18);
    routeMap.endMarker = Leaflet.circleMarker(latLngs[0], {
      radius: 7,
      color: "#0f766e",
      fillColor: "#0f766e",
      fillOpacity: 1,
    }).addTo(routeMap.map);
    routeMap.accuracyCircle = createAccuracyCircle(routeMap.map, routePoints[0]);
  } else {
    const lastPoint = routePoints[routePoints.length - 1];
    routeMap.startMarker = Leaflet.circleMarker(latLngs[0], {
      radius: 6,
      color: "#2563eb",
      fillColor: "#2563eb",
      fillOpacity: 1,
    }).addTo(routeMap.map);
    routeMap.endMarker = Leaflet.circleMarker(latLngs[latLngs.length - 1], {
      radius: 7,
      color: "#0f766e",
      fillColor: "#0f766e",
      fillOpacity: 1,
    }).addTo(routeMap.map);
    routeMap.accuracyCircle = createAccuracyCircle(routeMap.map, lastPoint);

    if (getRouteDistanceMeters(routePoints) < 250) {
      routeMap.map.setView(latLngs[latLngs.length - 1], 18);
    } else {
      routeMap.map.fitBounds(routeMap.polyline.getBounds(), {
        padding: [18, 18],
        maxZoom: 18,
      });
    }
  }

  window.setTimeout(() => routeMap.map.invalidateSize(), 0);
}

function canUseMap() {
  return Boolean(window.L);
}

function createAccuracyCircle(map, point) {
  if (!point?.accuracy) return null;

  return window.L.circle([point.latitude, point.longitude], {
    radius: point.accuracy,
    color: "#2563eb",
    opacity: 0.26,
    fillColor: "#2563eb",
    fillOpacity: 0.08,
    weight: 1,
  }).addTo(map);
}

function getRouteDistanceMeters(routePoints) {
  return routePoints.reduce((total, point, index) => {
    if (index === 0) return 0;

    return total + getDistanceMeters(routePoints[index - 1], point);
  }, 0);
}

function getLiveMapLabel() {
  if (!canUseMap()) return "지도 로드 실패";
  if (runState.routePoints.length > 1) return "자세한 경로";
  if (runState.routePoints.length === 1 || runState.livePosition) {
    const latestPoint = runState.livePosition || runState.routePoints[runState.routePoints.length - 1];
    return isAccurateEnoughForDistance(latestPoint) ? "현재 위치 확대" : "정확도 낮음";
  }
  if (runState.gpsStatus === "requesting") return "위치 찾는 중";
  if (runState.gpsStatus === "ready") return "GPS 연결됨";
  if (runState.gpsStatus === "weak") return "GPS 약함";
  if (runState.gpsStatus === "denied") return "권한 거부";
  if (runState.gpsStatus === "timeout") return "GPS 재시도";
  if (runState.gpsStatus === "unavailable") return "위치 불가";
  if (runState.gpsStatus === "stale") return "오래된 위치";

  return "GPS 대기";
}

function connectMedia() {
  const selectedFile = mediaFileInput?.files?.[0];
  const url = mediaUrlInput?.value.trim();

  stopMedia();
  clearMediaObjectUrl();
  hideMediaPlayers();

  if (selectedFile) {
    const kind = selectedFile.type.startsWith("video/") ? "video" : "audio";
    mediaObjectUrl = URL.createObjectURL(selectedFile);
    connectedMedia = {
      kind,
      source: mediaObjectUrl,
      name: selectedFile.name,
    };
    clearSavedMedia();
    shouldPlaySavedMediaOnTap = false;
    prepareConnectedMedia({ statusMessage: "파일 연결됨" });
    return;
  }

  if (!url) {
    setMediaStatus("연결 필요");
    return;
  }

  connectedMedia = getMediaFromUrl(url);
  saveConnectedMedia(connectedMedia);
  shouldPlaySavedMediaOnTap = true;
  prepareConnectedMedia({ statusMessage: connectedMedia.kind === "youtube" ? "영상 저장됨" : "저장됨" });
}

function prepareConnectedMedia(options = {}) {
  if (!connectedMedia) return;
  const { statusMessage } = options;

  if (connectedMedia.kind === "audio" && mediaAudio) {
    mediaAudio.src = connectedMedia.source;
    mediaAudio.hidden = false;
    mediaAudio.load();
  }

  if (connectedMedia.kind === "video" && mediaVideo) {
    mediaVideo.src = connectedMedia.source;
    mediaVideo.hidden = false;
    mediaVideo.load();
  }

  if (mediaPlayButton) mediaPlayButton.disabled = false;
  if (mediaStopButton) mediaStopButton.disabled = false;
  if (statusMessage) {
    setMediaStatus(statusMessage);
    return;
  }
  setMediaStatus(connectedMedia.kind === "youtube" ? "영상 연결됨" : "연결됨");
}

function playMedia() {
  if (!connectedMedia) {
    setMediaStatus("연결 필요");
    return;
  }

  if (connectedMedia.kind === "youtube") {
    hideMediaPlayers();
    if (mediaFrame && mediaFrameWrap) {
      mediaFrame.src = connectedMedia.source;
      mediaFrameWrap.hidden = false;
      shouldPlaySavedMediaOnTap = false;
      setMediaStatus("영상 재생");
    }
    return;
  }

  const player = connectedMedia.kind === "video" ? mediaVideo : mediaAudio;
  if (!player) return;

  hideMediaPlayers();
  player.hidden = false;
  shouldPlaySavedMediaOnTap = false;
  player.play()
    .then(() => setMediaStatus("재생 중"))
    .catch(() => setMediaStatus("재생 실패"));
}

function stopMedia(disableTapToPlay = false) {
  [mediaAudio, mediaVideo].forEach((player) => {
    if (!player) return;
    player.pause();
  });

  if (mediaFrame) {
    mediaFrame.src = "";
  }

  if (mediaFrameWrap) {
    mediaFrameWrap.hidden = true;
  }

  if (disableTapToPlay) {
    shouldPlaySavedMediaOnTap = false;
  }

  if (connectedMedia) {
    setMediaStatus("연결됨");
  }
}

function playSavedMediaFromScreenTap(event) {
  if (!shouldPlaySavedMediaOnTap || !connectedMedia) return;

  const target = event.target;
  if (target?.closest?.("button, input, audio, video, iframe, a")) return;

  const runScreen = document.getElementById("run-screen");
  if (!runScreen?.classList.contains("is-active")) return;
  if (!target?.closest?.("#run-screen")) return;

  playMedia();
}

function hideMediaPlayers() {
  if (mediaAudio) mediaAudio.hidden = true;
  if (mediaVideo) mediaVideo.hidden = true;
  if (mediaFrameWrap) mediaFrameWrap.hidden = true;
}

function clearMediaObjectUrl() {
  if (!mediaObjectUrl) return;
  URL.revokeObjectURL(mediaObjectUrl);
  mediaObjectUrl = null;
}

function setMediaStatus(message) {
  if (mediaStatus) {
    mediaStatus.textContent = message;
  }
}

function getMediaFromUrl(url) {
  const youtubeSource = getYouTubeEmbedUrl(url);
  if (youtubeSource) {
    return {
      kind: "youtube",
      source: youtubeSource,
      name: "YouTube",
      originalUrl: url,
    };
  }

  const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".m4v"];
  const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".flac", ".oga", ".ogg"];
  const kind = videoExtensions.some((extension) => cleanUrl.endsWith(extension))
    ? "video"
    : audioExtensions.some((extension) => cleanUrl.endsWith(extension))
      ? "audio"
      : "audio";

  return {
    kind,
    source: url,
    name: url,
    originalUrl: url,
  };
}

function getYouTubeEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace("www.", "");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = parsedUrl.pathname.slice(1);
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsedUrl.pathname === "/watch") {
        videoId = parsedUrl.searchParams.get("v") || "";
      } else if (parsedUrl.pathname.startsWith("/shorts/")) {
        videoId = parsedUrl.pathname.split("/")[2] || "";
      } else if (parsedUrl.pathname.startsWith("/embed/")) {
        videoId = parsedUrl.pathname.split("/")[2] || "";
      }
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1` : "";
  } catch {
    return "";
  }
}

function renderVoiceState() {
  if (!voiceStatus) return;

  if (!supportsVoice()) {
    voiceStatus.textContent = "미지원";
    if (voiceToggleLabel) voiceToggleLabel.textContent = "미지원";
    if (voiceToggle) voiceToggle.disabled = true;
    if (voiceTestButton) voiceTestButton.disabled = true;
    return;
  }

  voiceStatus.textContent = voiceToggle?.checked ? "5분마다" : "꺼짐";
  if (voiceToggleLabel) voiceToggleLabel.textContent = voiceToggle?.checked ? "켜짐" : "꺼짐";
}

function checkVoiceAnnouncement(elapsedMs) {
  if (runState.status !== "running") return;
  if (!voiceToggle?.checked || !supportsVoice()) return;

  const announcementMark = Math.floor(elapsedMs / VOICE_INTERVAL_MS) * VOICE_INTERVAL_MS;
  if (announcementMark < VOICE_INTERVAL_MS) return;
  if (announcementMark <= runState.lastVoiceAnnouncementMs) return;

  runState.lastVoiceAnnouncementMs = announcementMark;
  announceRunProgress();
}

function announceRunProgress(isTest = false) {
  if (!supportsVoice()) {
    if (voiceStatus) voiceStatus.textContent = "미지원";
    return;
  }

  const elapsedMs = getElapsedMs();
  const message = isTest && elapsedMs < 1000
    ? "음성 안내가 켜져 있습니다. 러닝 중 5분마다 거리와 시간당 속도를 알려드립니다."
    : getVoiceMessage(elapsedMs);
  const utterance = new SpeechSynthesisUtterance(message);
  const koreanVoice = speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ko"));

  utterance.lang = "ko-KR";
  utterance.rate = 1;
  utterance.pitch = 1;
  if (koreanVoice) utterance.voice = koreanVoice;

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  if (voiceStatus) voiceStatus.textContent = "안내 중";
  utterance.onend = renderVoiceState;
}

function stopVoice() {
  if (supportsVoice()) {
    speechSynthesis.cancel();
  }
  renderVoiceState();
}

function supportsVoice() {
  return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
}

function getVoiceMessage(elapsedMs) {
  const elapsedMinutes = Math.max(1, Math.floor(elapsedMs / 60000));
  const distanceKm = runState.distanceMeters / 1000;
  const speedKmh = getAverageSpeedKmh(elapsedMs, distanceKm);

  if (distanceKm < 0.01) {
    return `${elapsedMinutes}분 경과. 아직 이동 거리가 충분하지 않습니다.`;
  }

  return `${elapsedMinutes}분 경과. 현재 ${distanceKm.toFixed(2)}킬로미터, 시간당 ${speedKmh.toFixed(1)}킬로미터 속도입니다.`;
}

function getAverageSpeedKmh(elapsedMs, distanceKm) {
  const elapsedHours = elapsedMs / 3600000;
  if (elapsedHours <= 0 || distanceKm <= 0) return 0;

  return distanceKm / elapsedHours;
}

function changeCalendarMonth(change) {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + change, 1);
  selectedDateKey = getDateKey(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1));
  renderCalendar();
  renderDayDetail();
}

function selectRecordDate(record) {
  calendarDate = new Date(record.finishedAt);
  selectedDateKey = getDateKey(record.finishedAt);
  renderCalendar();
  renderDayDetail();
}

function loadSavedMedia() {
  try {
    const saved = localStorage.getItem(MEDIA_STORAGE_KEY);
    if (!saved) return;

    const media = normalizeSavedMedia(JSON.parse(saved));
    if (!media) {
      clearSavedMedia();
      return;
    }

    connectedMedia = media;
    shouldPlaySavedMediaOnTap = true;

    if (mediaUrlInput) {
      mediaUrlInput.value = media.originalUrl || media.source;
    }

    prepareConnectedMedia({ statusMessage: "저장됨" });
  } catch {
    clearSavedMedia();
  }
}

function saveConnectedMedia(media) {
  try {
    if (!media || media.source.startsWith("blob:")) {
      clearSavedMedia();
      return;
    }

    const savedMedia = {
      kind: media.kind,
      source: media.source,
      name: media.name,
      originalUrl: media.originalUrl || media.source,
    };

    localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(savedMedia));
  } catch {
    // Storage can fail in private or restricted browser modes.
  }
}

function clearSavedMedia() {
  try {
    localStorage.removeItem(MEDIA_STORAGE_KEY);
  } catch {
    // Storage can fail in private or restricted browser modes.
  }
}

function normalizeSavedMedia(media) {
  if (!media || typeof media.source !== "string") return null;
  if (media.source.startsWith("blob:")) return null;

  const kind = ["audio", "video", "youtube"].includes(media.kind) ? media.kind : "audio";

  return {
    kind,
    source: media.source,
    name: typeof media.name === "string" ? media.name : "저장된 미디어",
    originalUrl: typeof media.originalUrl === "string" ? media.originalUrl : media.source,
  };
}

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveRecords(nextRecords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  } catch {
    // Storage can fail in private or restricted browser modes.
  }
}

function createRecordId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getRecordsForDateKey(dateKey) {
  return records.filter((record) => getDateKey(record.finishedAt) === dateKey);
}

function createRoutePoint(position) {
  return {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy,
    timestamp: position.timestamp,
  };
}

function getTotalKm(nextRecords) {
  return nextRecords.reduce((total, record) => total + record.distanceMeters, 0) / 1000;
}

function getDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateKeyTitle(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(year, month - 1, day));
}

function formatRecordDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRecordTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRunHint() {
  if (runState.gpsMessage) {
    return runState.gpsMessage;
  }

  if (runState.gpsStatus === "denied") {
    return "위치 권한을 허용해야 거리를 기록할 수 있습니다";
  }

  if (runState.gpsStatus === "unsupported") {
    return "이 브라우저에서는 GPS를 사용할 수 없습니다";
  }

  if (runState.gpsStatus === "timeout") {
    return "GPS 응답이 늦어 자동으로 다시 연결하고 있습니다";
  }

  if (runState.gpsStatus === "unavailable") {
    return "위치 신호가 약합니다. 실외에서 하늘이 보이게 해보세요";
  }

  if (runState.gpsStatus === "weak") {
    return "GPS가 약하지만 위치를 계속 확인하고 있습니다";
  }

  if (runState.gpsStatus === "stale") {
    return "오래된 위치를 무시했습니다. GPS를 다시 연결해보세요";
  }

  if (runState.status === "idle") {
    return "시작 버튼을 누르면 GPS와 시간이 기록됩니다";
  }

  if (runState.status === "running") {
    return runState.gpsStatus === "ready"
      ? "거리와 시간이 함께 기록되고 있습니다"
      : "GPS 연결을 기다리는 중입니다";
  }

  if (runState.status === "paused") {
    return "재개를 누르면 GPS 추적도 이어집니다";
  }

  return "다음 단계에서 기록 저장을 연결합니다";
}

function getGpsLabel() {
  return {
    idle: "대기",
    requesting: "연결 중",
    ready: "연결됨",
    weak: "약함",
    denied: "권한 거부",
    unavailable: "위치 불가",
    timeout: "시간 초과",
    error: "오류",
    unsupported: "미지원",
    stale: "오래됨",
  }[runState.gpsStatus];
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const twoDigits = (value) => String(value).padStart(2, "0");

  if (hours > 0) {
    return `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
  }

  return `${twoDigits(minutes)}:${twoDigits(seconds)}`;
}

function formatPace(elapsedMs, distanceKm) {
  if (distanceKm < 0.01) return "--'--\"";

  const paceSeconds = Math.floor(elapsedMs / 1000 / distanceKm);
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = paceSeconds % 60;

  return `${minutes}'${String(seconds).padStart(2, "0")}"`;
}

function getDistanceMeters(from, to) {
  const earthRadiusMeters = 6371000;
  const latitude1 = toRadians(from.latitude);
  const latitude2 = toRadians(to.latitude);
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function isAccurateEnoughForDistance(position) {
  if (!position) return false;
  return Number.isFinite(position.accuracy) && position.accuracy <= MAX_DISTANCE_ACCURACY_METERS;
}

function isValidPosition(position) {
  return Number.isFinite(position.latitude) && Number.isFinite(position.longitude);
}

function isStalePosition(position) {
  return position.timestamp && Date.now() - position.timestamp > STALE_POSITION_MS;
}

function getGpsFixMessage(position) {
  const accuracyText = formatAccuracy(position, "약 ");

  return `현재 위치 수신 · ${accuracyText} · 지도 반영`;
}

function getGpsIgnoredMessage(position) {
  const accuracyText = formatAccuracy(position, "약 ");

  return `좌표는 받았지만 ${accuracyText}라 지도에 반영하지 않았습니다.`;
}

function getGpsDetail() {
  const permissionText = {
    granted: "권한 허용됨",
    prompt: "권한 확인 필요",
    denied: "권한 차단됨",
    unknown: "권한 상태 확인 중",
  }[runState.gpsPermission] || "권한 상태 확인 중";

  if (runState.lastGpsError) {
    return `${permissionText} · ${runState.lastGpsError}`;
  }

  const visiblePosition = runState.livePosition || runState.rawPosition;

  if (!visiblePosition) {
    return `${permissionText} · 실제 좌표를 아직 받지 못했습니다`;
  }

  const accuracyText = formatAccuracy(visiblePosition);
  const mapText = runState.livePosition ? "지도 반영" : "지도 미반영";
  const coordinateText = formatCoordinates(visiblePosition);
  const receivedText = runState.lastGpsAt
    ? `${new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(runState.lastGpsAt)} 수신`
    : "방금 수신";

  return `${permissionText} · ${mapText} · ${accuracyText} · ${coordinateText} · ${receivedText}`;
}

function getGpsErrorMessage(error) {
  if (error.code === error.PERMISSION_DENIED || error.code === 1) {
    return "위치 권한이 차단되어 있습니다";
  }

  if (error.code === error.POSITION_UNAVAILABLE || error.code === 2) {
    return "폰에서 현재 위치를 찾지 못했습니다";
  }

  if (error.code === error.TIMEOUT || error.code === 3) {
    return "GPS 응답 시간이 초과되었습니다";
  }

  return "GPS 오류가 발생했습니다";
}

function getGpsErrorHint(status) {
  return {
    denied: "위치 권한을 허용해야 현재 위치를 받을 수 있습니다.",
    unavailable: "폰이 현재 위치를 찾지 못했습니다. 실외에서 다시 시도해보세요.",
    timeout: "GPS 응답이 늦습니다. 자동 재시도 중입니다.",
    error: "GPS 오류가 발생했습니다. 앱을 다시 열어보세요.",
  }[status] || "";
}

function getLiveMapPlaceholderMessage() {
  if (!runState.livePosition && runState.routePoints.length === 0) {
    if (runState.rawPosition && !isAccurateEnoughForDistance(runState.rawPosition)) {
      return `GPS 좌표를 받았지만 ${formatAccuracy(runState.rawPosition)}라 지도에 반영하지 않았습니다.`;
    }

    if (runState.gpsStatus === "requesting") {
      return "현재 위치를 찾는 중입니다. 표시된 지도는 기본 위치입니다.";
    }

    if (runState.gpsStatus === "denied") {
      return "위치 권한이 차단되어 현재 위치를 표시할 수 없습니다.";
    }

    return "현재 위치를 아직 받지 못했습니다. 표시된 지도는 기본 위치입니다.";
  }

  if (runState.livePosition && !isAccurateEnoughForDistance(runState.livePosition)) {
    return `GPS 정확도가 약 ${Math.round(runState.livePosition.accuracy)}m라 실제 위치와 다를 수 있습니다.`;
  }

  return "";
}

function formatCoordinates(position) {
  return `좌표 ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`;
}

function formatAccuracy(position, prefix = "") {
  return Number.isFinite(position?.accuracy)
    ? `정확도 ${prefix}${Math.round(position.accuracy)}m`
    : "정확도 확인 중";
}

function isUsefulMovement(movedMeters, currentPosition, previousPosition) {
  if (movedMeters < 1) return false;
  if (!isAccurateEnoughForDistance(currentPosition)) return false;

  const elapsedSeconds = Math.max((currentPosition.timestamp - previousPosition.timestamp) / 1000, 1);
  const speedMetersPerSecond = movedMeters / elapsedSeconds;
  if (speedMetersPerSecond > MAX_RUNNING_SPEED_MPS && movedMeters > 30) return false;

  return true;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}
