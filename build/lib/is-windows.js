"use strict";
// from https://github.com/jonschlinkert/is-windows MIT Licensed
// inlined to avoid import problems in cypress
Object.defineProperty(exports, "__esModule", { value: true });
function isWindows() {
    var _a;
    return process && (process.platform === 'win32' || /^(msys|cygwin)$/.test((_a = process.env.OSTYPE) !== null && _a !== void 0 ? _a : ''));
}
exports.default = isWindows;
//# sourceMappingURL=is-windows.js.map