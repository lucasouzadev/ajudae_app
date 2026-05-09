const { spawn } = require("node:child_process");

const args = ["exec", "expo", "start", "--localhost"];
if (process.env.PORT) {
  args.push("--port", process.env.PORT);
}

const child = spawn("corepack", ["pnpm", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
