(function () {
    const state = {
        started: false,
        scoreEvents: 0,
        hiHatLayer: 0,
        finalTriggered: false,
        samplesLoaded: false,
        baseCode: "",
        lastRenderedCode: ""
    };

    const listeners = new Set();

    function notify() {
        for (const listener of listeners) {
            listener({ ...state });
        }
    }

    function onChange(listener) {
        listeners.add(listener);
        listener({ ...state });
        return () => listeners.delete(listener);
    }

    function buildHiHatNotation(scoreEvents) {
        if (scoreEvents <= 0) {
            return null;
        }

        const phases = [
            "hh*2",
            "hh*4",
            "[hh hh*2]",
            "hh*8",
            "<hh*8 hh*4>",
            "[hh*8 ~ hh*4]",
            "hh*12",
            "[hh*16 hh*8]",
            "<hh*8 [hh hh*4] hh*12>",
            "{hh*8 hh*16}%2"
        ];

        return phases[(scoreEvents - 1) % phases.length];
    }

    async function waitForStrudel(timeoutMs = 5000) {
        const start = Date.now();
        while (typeof initStrudel !== "function") {
            if (Date.now() - start > timeoutMs) {
                throw new Error("Strudel runtime not available. Check firewall or local install.");
            }
            await new Promise((resolve) => setTimeout(resolve, 80));
        }
    }

    async function ensureSamplesLoaded() {
        if (state.samplesLoaded) {
            return;
        }

        if (typeof samples !== "function") {
            throw new Error("Strudel samples() API not found.");
        }

        await samples(
            {
                bd: ["bd/BT0A0D0.wav"],
                sd: ["sd/rytm-01-classic.wav"],
                cp: ["sd/rytm-00-hard.wav"],
                hh: ["hh/000_hh3closedhh.wav"],
                gong: ["sd/rytm-00-hard.wav"]
            },
            "github:tidalcycles/dirt-samples"
        );

        state.samplesLoaded = true;
    }

    function evaluateCode(code) {
        const wrapped = `'use strict'; return (${code});`;
        const runner = new Function(wrapped);
        const pattern = runner();

        if (!pattern || typeof pattern.play !== "function") {
            throw new Error("Code must return a Strudel pattern. Example: stack(s(\"bd sd\"))");
        }

        // Re-evaluate during playback for Strudel-style live coding updates.
        if (typeof hush === "function") {
            hush();
        }
        pattern.play();

        state.lastRenderedCode = code;
        notify();
    }

    function render() {
        if (!state.started) {
            return;
        }

        const hh = buildHiHatNotation(state.scoreEvents);
        const overlays = [];

        if (hh) {
            const overlayGain = 0.6 + (Math.min(state.scoreEvents, 12) * 0.04);
            overlays.push(`s("${hh}").gain(${Math.min(overlayGain, 0.9).toFixed(2)})`);
        }

        if (state.finalTriggered) {
            overlays.push('s("gong!2").gain(1.15).room(0.5).size(0.9).slow(2)');
            overlays.push('s("bd").gain(0.9).slow(2)');
        }

        const finalCode = overlays.length > 0
            ? `stack(${state.baseCode}, ${overlays.join(", ")})`
            : state.baseCode;

        evaluateCode(finalCode);
    }

    async function start(baseCode) {
        await waitForStrudel();

        if (!state.started) {
            await initStrudel();
            await ensureSamplesLoaded();
            if (typeof setcps === "function") {
                setcps(1.1);
            }
        }

        state.started = true;
        state.baseCode = baseCode;
        state.scoreEvents = 0;
        state.hiHatLayer = 0;
        state.finalTriggered = false;
        render();
        notify();
    }

    function stop() {
        if (typeof hush === "function") {
            hush();
        }
        state.started = false;
        notify();
    }

    function applyBaseCode(baseCode) {
        state.baseCode = baseCode;
        render();
    }

    function onScore() {
        state.scoreEvents += 1;
        state.hiHatLayer = Math.min(state.scoreEvents, 12);
        render();
    }

    function onFinal() {
        state.finalTriggered = true;
        render();
    }

    window.audioEngine = {
        start,
        stop,
        onScore,
        onFinal,
        applyBaseCode,
        onChange
    };
})();
