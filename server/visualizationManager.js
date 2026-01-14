const sessionManager = require('./sessionManager');

const VISUALIZATIONS = {
    'bubble': {
        name: "Bubble Sort (C)",
        file: 'bubble.c',
        // Minified version to avoid JS multiline string escaping issues
        code: '#include <stdio.h>\n#include <unistd.h>\nint main() { printf("Visualizing...\n"); for(int i=0; i<5; i++) { printf("Frame %d\n", i); fflush(stdout); usleep(100000); } printf("Done!\n"); return 0; }'
    }
};

class VisualizationManager {
    
    async prepareVisualization(sessionId, vizId) {
        const viz = VISUALIZATIONS[vizId];
        if (!viz) throw new Error("Visualization not found.");

        const b64 = Buffer.from(viz.code).toString('base64');
        await sessionManager.executeCommand(sessionId, `echo "${b64}" | base64 -d > ${viz.file}`);
        
        const compileCmd = `gcc ${viz.file} -o ${vizId}_app`;
        const result = await sessionManager.executeCommand(sessionId, compileCmd);
        
        if (result.error) throw new Error(`Compilation failed: ${result.error}`);
        
        return `./${vizId}_app`;
    }
}

module.exports = new VisualizationManager();
