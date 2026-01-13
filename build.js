import * as child_process from "node:child_process";
import * as fs from "node:fs/promises";
import * as esbuild from "esbuild";
import typoraPlugin, { installDevPlugin, closeTypora } from "esbuild-plugin-typora";
import { sassPlugin } from "esbuild-sass-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const IS_PROD = args.includes("--prod");
const IS_DEV = !IS_PROD;

await fs.rm("./dist", { recursive: true, force: true });

await esbuild.build({
  entryPoints: ["src/main.ts"],
  outdir: "dist",
  format: "esm",
  bundle: true,
  minify: IS_PROD,
  sourcemap: IS_DEV,
  plugins: [
    typoraPlugin({
      mode: IS_PROD ? "production" : "development",
    }),
    sassPlugin(),
  ],
});

if (IS_DEV) {
  await installDevPlugin();
  await closeTypora();

  const typoraExe =
    process.env.TYPORA_EXE || "C:\\Users\\bebbertc\\AppData\\Local\\Programs\\Typora\\Typora.exe";

  const fileToOpen = path.resolve(__dirname, "test", "vault", "doc.md");

  // start "" — важно для GUI-приложений из node на Windows
  const cmd = `start "" "${typoraExe}" "${fileToOpen}"`;

  child_process.exec(`cmd /c ${cmd}`, (err, stdout, stderr) => {
    if (err) console.error("[typora-run] err:", err);
    if (stdout) console.log("[typora-run] stdout:", stdout);
    if (stderr) console.error("[typora-run] stderr:", stderr);
  });
}
