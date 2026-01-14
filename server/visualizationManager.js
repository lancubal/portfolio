const sessionManager = require('./sessionManager');

const VISUALIZATIONS = {
    'bubble': {
        name: "Bubble Sort (C)",
        file: 'bubble.c',
        code: [
            '#include <stdio.h>',
            '#include <stdlib.h>',
            '#include <unistd.h>',
            '#include <time.h>',
            '',
            '#define SIZE 10',
            '#define DELAY 100000 // 100ms',
            '',
            'void print_array(int arr[], int size, int current_idx) {',
            '    // Clear screen (ANSI ESC [2J) and move cursor to top-left (ESC [H)',
            '    // Using \x1b for escape character to avoid octal issues in JS', // This comment is fine, it's not code
            '    printf("\x1b[2J\x1b[H");', // This is correct C code, not JS string literal escaping
            '    printf("Visualizing Bubble Sort (C)\n");', // This is correct C code, not JS string literal escaping
            '    printf("---------------------------\n\n");', // This is correct C code, not JS string literal escaping
            '    ',
            '    for (int i = 0; i < size; i++) {',
            '        // Print bar', // This comment is fine
            '        if (i == current_idx || i == current_idx + 1) {',
            '            printf("\x1b[31m"); // Red for active comparison', // This is correct C code, not JS string literal escaping
            '        } else {',
            '            printf("\x1b[32m"); // Green for others', // This is correct C code, not JS string literal escaping
            '        }',
            '        ', // This is fine
            '        for (int j = 0; j < arr[i]; j++) {',
            '            printf("#");', // This is correct C code, not JS string literal escaping
            '        }',
            '        printf(" (%d)\x1b[0m\n", arr[i]);', // This is correct C code, not JS string literal escaping
            '    }',
            '    printf("\n");', // This is correct C code, not JS string literal escaping
            '    fflush(stdout); // Crucial for streaming!', // This comment is fine
            '}',
            '',
            'int main() {',
            '    int arr[SIZE] = {9, 3, 5, 1, 8, 2, 7, 4, 10, 6};', // This is correct C code, not JS string literal escaping
            '    int i, j, temp;',
            '    ',
            '    srand(time(NULL));', // This is correct C code, not JS string literal escaping
            '',
            '    for (i = 0; i < SIZE - 1; i++) {',
            '        for (j = 0; j < SIZE - i - 1; j++) {',
            '            print_array(arr, SIZE, j);', // This is correct C code, not JS string literal escaping
            '            usleep(DELAY);', // This is correct C code, not JS string literal escaping
            '            ',
            '            if (arr[j] > arr[j + 1]) {',
            '                temp = arr[j];', // This is correct C code, not JS string literal escaping
            '                arr[j] = arr[j + 1];', // This is correct C code, not JS string literal escaping
            '                arr[j + 1] = temp;', // This is correct C code, not JS string literal escaping
            '                ',
            '                print_array(arr, SIZE, j);', // This is correct C code, not JS string literal escaping
            '                usleep(DELAY);', // This is correct C code, not JS string literal escaping
            '            }',
            '        }',
            '    }',
            '    ',
            '    print_array(arr, SIZE, -1);', // This is correct C code, not JS string literal escaping
            '    printf("Sorted!\n");', // This is correct C code, not JS string literal escaping
            '    return 0;', // This is correct C code, not JS string literal escaping
            '}'
        ].join('\n')
    }
};

class VisualizationManager {
    
    async prepareVisualization(sessionId, vizId) {
        const viz = VISUALIZATIONS[vizId];
        if (!viz) throw new Error("Visualization not found.");

        // 1. Write the C file to the container using Base64 to avoid escaping hell
        const b64 = Buffer.from(viz.code).toString('base64');
        await sessionManager.executeCommand(sessionId, `echo "${b64}" | base64 -d > ${viz.file}`);
        
        // 2. Compile it
        const compileCmd = `gcc ${viz.file} -o ${vizId}_app`;
        const result = await sessionManager.executeCommand(sessionId, compileCmd);
        
        if (result.error) {
            console.error("Compilation Error:", result.error);
            throw new Error(`Compilation failed: ${result.error}`);
        }
        
        return `./${vizId}_app`;
    }
}

module.exports = new VisualizationManager();