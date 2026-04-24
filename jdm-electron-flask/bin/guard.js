#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  jdm-electron-flask  —  guard.js
//  Blocks direct invocation. Must be used via jdm-cli.
// ─────────────────────────────────────────────────────────────
import chalk from "chalk";
import stringWidth from "string-width";
import stripAnsi from "strip-ansi";

const box = (lines) => {
    const cleaned = lines.map(l => stripAnsi(l));

    const width = Math.max(...cleaned.map(stringWidth));

    const horizontal = width + 2;

    const top = "┌" + "─".repeat(horizontal) + "┐";
    const bottom = "└" + "─".repeat(horizontal) + "┘";

    const mid = lines.map((l, i) => {
        const rawWidth = stringWidth(cleaned[i]);
        const pad = horizontal - rawWidth - 1;
        return "│ " + l + " ".repeat(pad) + "│";
    });
    return [top, ...mid, bottom].join("\n");
};

const output = box([
    chalk.red("⛔ Direct usage is not allowed."),
    "",
    "This package is a jdm-cli plugin.",
    "Install jdm-cli first, then register this plugin:",
    "",
    "npm install -g jdm-cli",
    "jdm-cli add electron-flask",
    "",
    "Then use it via:",
    "jdm-cli electron-flask <command>",
]);

console.log("\n" + output + "\n");