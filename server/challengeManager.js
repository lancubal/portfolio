const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const sessionManager = require('./sessionManager');

// --- CHALLENGE DATA DEFINITION ---
const CHALLENGES = {
    '1': {
        name: "Broken Calculator (Warmup)",
        description: "The 'add' function is subtracting. Fix it.",
        testFile: "test_calc.py",
        files: {
            'calculator.py': "class Calculator:\n    def add(self, a, b):\n        # BUG: This should be addition!\n        return a - b\n\n    def subtract(self, a, b):\n        return a - b",

            'test_calc.py': "import unittest\nfrom calculator import Calculator\n\nclass TestCalculator(unittest.TestCase):\n    def setUp(self):        self.calc = Calculator()\n\n    def test_add(self):\n        self.assertEqual(self.calc.add(5, 3), 8, '5 + 3 should be 8')\n        self.assertEqual(self.calc.add(-1, 1), 0, '-1 + 1 should be 0')\n\nif __name__ == '__main__':\n    unittest.main()"
        }
    },
    '2': {
        name: "The Palindrome Liar",
        description: "This function thinks 'racer' is a palindrome just because it starts and ends with 'r'. Fix logic.",
        testFile: "test_pal.py",
        files: {
            'palindrome.py':"\ndef is_palindrome(word):\n    # BUG: This only checks start and end chars!\n    # We need to check the whole word.\n    if len(word) <= 1: return True\n    return word[0] == word[-1]",

            'test_pal.py': "\nimport unittest\nfrom palindrome import is_palindrome\n\nclass TestPalindrome(unittest.TestCase):\n    def test_true(self):\n        self.assertTrue(is_palindrome('racecar'))\n        self.assertTrue(is_palindrome('a'))\n\n    def test_false(self):\n        self.assertFalse(is_palindrome('racer'), 'racer starts/ends with r but is NOT a palindrome')\n        self.assertFalse(is_palindrome('hello'))\n\nif __name__ == '__main__':\n    unittest.main()"
        }
    },
    '3': {
        name: "The Negative Bias",
        description: "Find the max number. Works fine... until you give it negative numbers.",
        testFile: "test_max.py",
        files: {
            'max_finder.py': "\ndef find_max(numbers):\n    if not numbers: return None\n    # BUG: Initializing to 0 fails if all numbers are negative (e.g. [-5, -10])\n    max_val = 0\n    for n in numbers:\n        if n > max_val:\n            max_val = n\n    return max_val",

            'test_max.py': "\nimport unittest\nfrom max_finder import find_max\n\nclass TestMax(unittest.TestCase):\n    def test_positive(self):\n        self.assertEqual(find_max([1, 5, 3]), 5)\n\n    def test_negative(self):\n        # Should return -1, but returns 0 because of the bug\n        self.assertEqual(find_max([-5, -1, -10]), -1, 'Failed with all negative numbers')\n\nif __name__ == '__main__':\n    unittest.main()"
        }
    },
    '4': {
        name: "Infinite Doom (Recursion)",
        description: "Calculate Factorial. Warning: This code might crash the simulation if not fixed.",
        testFile: "test_fact.py",
        files: {
            'factorial.py': "\ndef factorial(n):\n    # BUG: Where is the base case? (if n == 0: return 1)\n    # This will run forever!\n    return n * factorial(n - 1)",

            'test_fact.py': "\nimport unittest\nfrom factorial import factorial\n\nclass TestFactorial(unittest.TestCase):\n    def test_fact(self):\n        self.assertEqual(factorial(5), 120)\n        self.assertEqual(factorial(0), 1)\n\nif __name__ == '__main__':\n    unittest.main()"
        }
    },
    '5': {
        name: "The Log Janitor (Bash)",
        description: "Write a script in 'cleaner.sh' that deletes all files with .log extension in the current directory.",
        testFile: "test_bash.py",
        files: {
            'cleaner.sh': "#!/bin/sh\n# Write your code here to delete *.log files\n",
            'test_bash.py': "\nimport unittest, os, subprocess\nclass TestBash(unittest.TestCase):\n    def test_cleanup(self):\n        # 1. Create dummy files\n        open('test1.log', 'w').close()\n        open('test2.log', 'w').close()\n        open('keep.txt', 'w').close()\n        # 2. Run user script\n        subprocess.run(['sh', 'cleaner.sh'])\n        # 3. Check results\n        files = os.listdir('.')\n        self.assertNotIn('test1.log', files)\n        self.assertNotIn('test2.log', files)\n        self.assertIn('keep.txt', files)\nif __name__ == '__main__':\n    unittest.main()"
        }
    },
    '6': {
        name: "The SQL Gatekeeper",
        description: "The login logic in 'auth.py' is vulnerable to SQL Injection. Fix it using parameterized queries.",
        testFile: "test_sqli.py",
        files: {
            'auth.py': "\nimport sqlite3\nimport sqlite3\ndef login(username, password):\n    db = sqlite3.connect(':memory:')\n    db.execute('CREATE TABLE users (user text, pass text)')\n    db.execute(\"INSERT INTO users VALUES ('admin', 'top-secret-123')\")\n    # BUG: Vulnerable string formatting!\n    query = f\"SELECT * FROM users WHERE user = '{username}' AND pass = '{password}'\"\n    cursor = db.execute(query)\n    return cursor.fetchone() is not None",

            'test_sqli.py': "\nimport unittest\nfrom auth import login\nclass TestSecurity(unittest.TestCase):\n    def test_normal_login(self):\n        self.assertTrue(login('admin', 'top-secret-123'))\n    def test_sqli_attack(self):\n        # This should FAIL if the code is secured\n        attack_success = login(\"admin' --\", 'wrong-password')\n        self.assertFalse(attack_success, 'SECURITY ALERT: SQL Injection bypassed login!')\nif __name__ == '__main__':\n    unittest.main()"
        }
    }
};

class ChallengeManager {
    
    constructor() {
        this.activeChallenges = new Map(); // sessionId -> challengeId
    }

    getChallengeList() {
        return Object.entries(CHALLENGES).map(([id, data]) => ({
            id,
            name: data.name,
            description: data.description
        }));
    }

    async loadChallenge(sessionId, challengeId) {
        const challenge = CHALLENGES[challengeId];
        if (!challenge) throw new Error("Challenge not found.");

        const session = sessionManager.sessions.get(sessionId);
        if (!session) throw new Error("Session invalid.");

        console.log(`[${sessionId}] Loading Challenge ${challengeId}...`);

        // Write files to container using Base64
        for (const [filename, content] of Object.entries(challenge.files)) {
            const b64 = Buffer.from(content).toString('base64');
            const cmd = `echo "${b64}" | base64 -d > ${filename}`;
            await sessionManager.executeCommand(sessionId, cmd);
        }
        
        this.activeChallenges.set(sessionId, challengeId);
        return challenge;
    }

    async verifyChallenge(sessionId) {
        const challengeId = this.activeChallenges.get(sessionId);
        if (!challengeId) throw new Error("No active challenge.");

        const challenge = CHALLENGES[challengeId];
        
        // Use dynamic test file name
        const cmd = `python3 -m unittest ${challenge.testFile}`;
        const result = await sessionManager.executeCommand(sessionId, cmd);
        
        // Output analysis
        const combinedOutput = (result.output + "\n" + (result.error || "")).toLowerCase();
        
        // Special check for Timeout in Recursion Challenge
        if (combinedOutput.includes("timeout")) {
             return {
                passed: false,
                output: "TIMEOUT ERROR: Infinite loop detected! Did you forget the base case?"
            };
        }

        const isSuccess = combinedOutput.includes("ok") && 
                          !combinedOutput.includes("failed") && 
                          !combinedOutput.includes("error");
        
        return {
            passed: isSuccess,
            output: result.error || result.output || "No output from tests."
        };
    }
}

module.exports = new ChallengeManager();