import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const prismaClientDir = path.join(projectRoot, "node_modules", "@prisma", "client");
const generatedDir = path.join(projectRoot, "node_modules", ".prisma");
const linkPath = path.join(prismaClientDir, ".prisma");

function exists(p) {
    try {
        fs.lstatSync(p);
        return true;
    } catch {
        return false;
    }
}

if (!exists(prismaClientDir) || !exists(generatedDir)) {
    process.exit(0);
}

try {
    if (exists(linkPath)) {
        fs.rmSync(linkPath, { recursive: true, force: true });
    }

    const relativeTarget = path.relative(prismaClientDir, generatedDir) || "../../.prisma";
    fs.symlinkSync(relativeTarget, linkPath, "junction");
} catch (error) {
    // Don’t fail installs if symlinks aren’t supported.
    process.exit(0);
}
