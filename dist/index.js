"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
(0, child_process_1.exec)('git pull origin main', (err, stdout, stderr) => {
    if (err) {
        console.error('Git error:', err);
        return;
    }
    console.log(stdout);
    console.error(stderr);
});
