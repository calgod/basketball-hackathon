const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 6000);
const DATA_MODE = process.env.DATA_MODE || "simulation";
const MIN_TICKS_BEFORE_FINAL = Number(process.env.MIN_TICKS_BEFORE_FINAL || 16);
const MAX_TICKS_BEFORE_FINAL = Number(process.env.MAX_TICKS_BEFORE_FINAL || 30);
const PUBLIC_DIR = path.join(__dirname, "public");
const STRUDEL_DIST_DIR = path.join(__dirname, "node_modules", "@strudel", "web", "dist");

const clients = new Set();

const game = {
    id: "mm-elite8-001",
    homeTeam: "Duke",
    awayTeam: "Houston",
    homeScore: 62,
    awayScore: 60,
    status: "live",
    updatedAt: new Date().toISOString()
};

let eventId = 1;
let tickCount = 0;

function json(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body)
    });
    res.end(body);
}

function sendSse(res, eventName, payload) {
    res.write(`id: ${eventId++}\n`);
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcast(eventName, payload) {
    for (const client of clients) {
        sendSse(client, eventName, payload);
    }
}

function buildScoreEvent(scoringTeam, points) {
    return {
        type: "score",
        gameId: game.id,
        scoringTeam,
        points,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status,
        timestamp: new Date().toISOString()
    };
}

function buildFinalEvent() {
    const winner = game.homeScore === game.awayScore
        ? "tie"
        : game.homeScore > game.awayScore
            ? game.homeTeam
            : game.awayTeam;

    return {
        type: "final",
        gameId: game.id,
        winner,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: "final",
        timestamp: new Date().toISOString()
    };
}

function simulateTick() {
    if (game.status === "final") {
        return;
    }

    tickCount += 1;
    const canFinalize = tickCount >= MIN_TICKS_BEFORE_FINAL;
    const mustFinalize = tickCount >= MAX_TICKS_BEFORE_FINAL;
    const shouldFinalize = mustFinalize || (canFinalize && Math.random() < 0.14);

    if (shouldFinalize) {
        game.status = "final";
        game.updatedAt = new Date().toISOString();
        broadcast("game-final", buildFinalEvent());
        broadcast("game-update", game);
        return;
    }

    const homeScored = Math.random() > 0.5;
    const points = Math.random() > 0.75 ? 3 : 2;

    if (homeScored) {
        game.homeScore += points;
    } else {
        game.awayScore += points;
    }

    game.updatedAt = new Date().toISOString();

    const scoringTeam = homeScored ? game.homeTeam : game.awayTeam;
    broadcast("score", buildScoreEvent(scoringTeam, points));
    broadcast("game-update", game);
}

if (DATA_MODE === "simulation") {
    setInterval(simulateTick, POLL_INTERVAL_MS);
}

function serveStatic(req, res) {
    let filePath = req.url === "/" ? "/index.html" : req.url;
    filePath = path.normalize(filePath).replace(/^\\+|^\/+/, "");
    const absolutePath = path.join(PUBLIC_DIR, filePath);

    if (!absolutePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.readFile(absolutePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }

        const ext = path.extname(absolutePath);
        const types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8"
        };

        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        res.end(data);
    });
}

function serveFromRoot(rootDir, reqPath, res) {
    const relativePath = path.normalize(reqPath).replace(/^\\+|^\/+/, "");
    const absolutePath = path.join(rootDir, relativePath);

    if (!absolutePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.readFile(absolutePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }

        const ext = path.extname(absolutePath);
        const types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".mjs": "text/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".map": "application/json; charset=utf-8"
        };

        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    if (!req.url) {
        res.writeHead(400);
        res.end("Bad request");
        return;
    }

    if (req.url === "/api/game") {
        json(res, 200, game);
        return;
    }

    if (req.url === "/api/events") {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*"
        });

        clients.add(res);

        sendSse(res, "game-update", game);

        req.on("close", () => {
            clients.delete(res);
        });

        return;
    }

    if (req.url === "/api/reset" && req.method === "POST") {
        game.homeScore = 62;
        game.awayScore = 60;
        game.status = "live";
        game.updatedAt = new Date().toISOString();
        tickCount = 0;
        broadcast("game-update", game);
        json(res, 200, { ok: true, game });
        return;
    }

    if (req.url.startsWith("/vendor/strudel/")) {
        const distPath = req.url.replace("/vendor/strudel/", "");
        serveFromRoot(STRUDEL_DIST_DIR, distPath, res);
        return;
    }

    serveStatic(req, res);
});

server.listen(PORT, () => {
    console.log(`March Madness Strudel app running on http://localhost:${PORT}`);
});
