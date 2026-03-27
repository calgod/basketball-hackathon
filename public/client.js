(function () {
    const els = {
        awayTeam: document.getElementById("away-team"),
        awayScore: document.getElementById("away-score"),
        homeTeam: document.getElementById("home-team"),
        homeScore: document.getElementById("home-score"),
        status: document.getElementById("game-status"),
        startAudio: document.getElementById("start-audio"),
        stopAudio: document.getElementById("stop-audio"),
        resetGame: document.getElementById("reset-game"),
        applyCode: document.getElementById("apply-code"),
        baseCode: document.getElementById("base-code"),
        renderedCode: document.getElementById("rendered-code"),
        scoreEvents: document.getElementById("score-events"),
        hhLayer: document.getElementById("hh-layer"),
        audioState: document.getElementById("audio-state"),
        log: document.getElementById("event-log")
    };

    function log(message) {
        const li = document.createElement("li");
        li.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        els.log.prepend(li);

        while (els.log.children.length > 20) {
            els.log.removeChild(els.log.lastChild);
        }
    }

    function renderGame(game) {
        els.awayTeam.textContent = game.awayTeam;
        els.homeTeam.textContent = game.homeTeam;
        els.awayScore.textContent = String(game.awayScore);
        els.homeScore.textContent = String(game.homeScore);

        const isFinal = game.status === "final";
        els.status.textContent = isFinal ? "FINAL" : "LIVE";
        els.status.classList.toggle("live", !isFinal);
        els.status.classList.toggle("final", isFinal);
    }

    async function loadInitialGame() {
        const response = await fetch("/api/game");
        if (!response.ok) {
            throw new Error("Failed to load initial game state.");
        }
        const game = await response.json();
        renderGame(game);
    }

    function setupEvents() {
        const source = new EventSource("/api/events");

        source.addEventListener("game-update", (event) => {
            const game = JSON.parse(event.data);
            renderGame(game);
        });

        source.addEventListener("score", (event) => {
            const payload = JSON.parse(event.data);
            window.audioEngine.onScore(payload);
            log(`${payload.scoringTeam} scored ${payload.points}`);
        });

        source.addEventListener("game-final", (event) => {
            const payload = JSON.parse(event.data);
            window.audioEngine.onFinal(payload);
            log(`Game final. Winner: ${payload.winner}`);
        });

        source.onerror = () => {
            log("Event stream interrupted. Browser will retry automatically.");
        };
    }

    function setupUi() {
        window.audioEngine.onChange((audioState) => {
            els.scoreEvents.textContent = String(audioState.scoreEvents);
            els.hhLayer.textContent = String(audioState.hiHatLayer);
            els.audioState.textContent = audioState.started ? "running" : "stopped";
            els.renderedCode.textContent = audioState.lastRenderedCode || "(audio not started)";
        });

        els.startAudio.addEventListener("click", async () => {
            try {
                await window.audioEngine.start(els.baseCode.value);
                log("Audio started. Live score events now mutate the beat.");
            } catch (error) {
                log(`Audio start failed: ${error.message}`);
            }
        });

        els.stopAudio.addEventListener("click", () => {
            window.audioEngine.stop();
            log("Audio stopped.");
        });

        els.applyCode.addEventListener("click", () => {
            try {
                window.audioEngine.applyBaseCode(els.baseCode.value);
                log("Applied new base Strudel code.");
            } catch (error) {
                log(`Code apply failed: ${error.message}`);
            }
        });

        els.resetGame.addEventListener("click", async () => {
            await fetch("/api/reset", { method: "POST" });
            log("Simulation game reset.");
        });
    }

    async function main() {
        await loadInitialGame();
        setupEvents();
        setupUi();
        log("Connected to live game simulation stream.");
    }

    main().catch((error) => {
        log(`Initialization error: ${error.message}`);
    });
})();
