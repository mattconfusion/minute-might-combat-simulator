// ============================================
// MINUTE MIGHT BALANCER - TEST SUITE
// ============================================
// Run tests by opening tests.html in a browser
// or by running: node tests.js (requires script.js functions to be imported)

// Simple test framework
const TestRunner = {
    passed: 0,
    failed: 0,
    results: [],

    assert(condition, message) {
        if (condition) {
            this.passed++;
            this.results.push({ status: 'PASS', message });
        } else {
            this.failed++;
            this.results.push({ status: 'FAIL', message });
            console.error(`FAIL: ${message}`);
        }
    },

    assertEqual(actual, expected, message) {
        const pass = JSON.stringify(actual) === JSON.stringify(expected);
        if (pass) {
            this.passed++;
            this.results.push({ status: 'PASS', message });
        } else {
            this.failed++;
            this.results.push({ status: 'FAIL', message: `${message} - Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}` });
            console.error(`FAIL: ${message}`);
            console.error(`  Expected: ${JSON.stringify(expected)}`);
            console.error(`  Got: ${JSON.stringify(actual)}`);
        }
    },

    assertInRange(value, min, max, message) {
        const pass = value >= min && value <= max;
        if (pass) {
            this.passed++;
            this.results.push({ status: 'PASS', message });
        } else {
            this.failed++;
            this.results.push({ status: 'FAIL', message: `${message} - Value ${value} not in range [${min}, ${max}]` });
            console.error(`FAIL: ${message} - Value ${value} not in range [${min}, ${max}]`);
        }
    },

    report() {
        console.log('\n========================================');
        console.log(`TEST RESULTS: ${this.passed} passed, ${this.failed} failed`);
        console.log('========================================\n');
        return { passed: this.passed, failed: this.failed, results: this.results };
    }
};

// ============================================
// TESTS: parseDiceNotation
// ============================================

function testParseDiceNotation() {
    console.log('\n--- Testing parseDiceNotation ---');

    // Test empty/null input
    TestRunner.assertEqual(parseDiceNotation(null), null, 'parseDiceNotation(null) returns null');
    TestRunner.assertEqual(parseDiceNotation(''), null, 'parseDiceNotation("") returns null');
    TestRunner.assertEqual(parseDiceNotation('   '), null, 'parseDiceNotation("   ") returns null');

    // Test per-figure notation
    const result1 = parseDiceNotation('2d6/1f');
    TestRunner.assertEqual(result1.perFigure.length, 1, '2d6/1f has 1 perFigure entry');
    TestRunner.assertEqual(result1.perFigure[0].count, 2, '2d6/1f count is 2');
    TestRunner.assertEqual(result1.perFigure[0].faces, 6, '2d6/1f faces is 6');
    TestRunner.assertEqual(result1.perFigure[0].perFigures, 1, '2d6/1f perFigures is 1');
    TestRunner.assertEqual(result1.flat.length, 0, '2d6/1f has no flat dice');

    // Test flat notation
    const result2 = parseDiceNotation('1d8');
    TestRunner.assertEqual(result2.perFigure.length, 0, '1d8 has no perFigure entries');
    TestRunner.assertEqual(result2.flat.length, 1, '1d8 has 1 flat entry');
    TestRunner.assertEqual(result2.flat[0].count, 1, '1d8 count is 1');
    TestRunner.assertEqual(result2.flat[0].faces, 8, '1d8 faces is 8');

    // Test combined notation
    const result3 = parseDiceNotation('2d6/1f + 1d8');
    TestRunner.assertEqual(result3.perFigure.length, 1, '2d6/1f + 1d8 has 1 perFigure entry');
    TestRunner.assertEqual(result3.flat.length, 1, '2d6/1f + 1d8 has 1 flat entry');
    TestRunner.assertEqual(result3.perFigure[0].faces, 6, 'perFigure is d6');
    TestRunner.assertEqual(result3.flat[0].faces, 8, 'flat is d8');

    // Test case insensitivity and whitespace handling
    const result4 = parseDiceNotation('  2D6/1F  +  1D8  ');
    TestRunner.assertEqual(result4.perFigure.length, 1, 'Handles uppercase and whitespace');

    // Test invalid notation
    TestRunner.assertEqual(parseDiceNotation('invalid'), null, 'Invalid notation returns null');
    TestRunner.assertEqual(parseDiceNotation('abc123'), null, 'Random string returns null');

    // Test multiple perFigure
    const result5 = parseDiceNotation('1d6/1f + 1d8/2f');
    TestRunner.assertEqual(result5.perFigure.length, 2, 'Multiple perFigure entries parsed');
}

// ============================================
// TESTS: validateDiceNotation
// ============================================

function testValidateDiceNotation() {
    console.log('\n--- Testing validateDiceNotation ---');

    // Valid notations
    let result = validateDiceNotation('2d6/1f');
    TestRunner.assert(result.valid, '2d6/1f is valid');
    TestRunner.assertEqual(result.diceTypes, [6], '2d6/1f diceTypes is [6]');

    result = validateDiceNotation('1d8');
    TestRunner.assert(result.valid, '1d8 is valid');
    TestRunner.assertEqual(result.diceTypes, [8], '1d8 diceTypes is [8]');

    result = validateDiceNotation('2d6/1f + 1d8');
    TestRunner.assert(result.valid, '2d6/1f + 1d8 is valid');
    TestRunner.assertEqual(result.diceTypes, [6, 8], 'Combined notation has both dice types');

    // Invalid notations
    result = validateDiceNotation('');
    TestRunner.assert(!result.valid, 'Empty string is invalid');

    result = validateDiceNotation('abc');
    TestRunner.assert(!result.valid, 'Random text is invalid');

    result = validateDiceNotation('0d6/1f');
    TestRunner.assert(!result.valid, '0 dice count is invalid');

    result = validateDiceNotation('1d1/1f');
    TestRunner.assert(!result.valid, 'd1 is invalid (faces < 2)');
}

// ============================================
// TESTS: rollDie
// ============================================

function testRollDie() {
    console.log('\n--- Testing rollDie ---');

    // Test d6 rolls are in range
    for (let i = 0; i < 100; i++) {
        const roll = rollDie(6);
        TestRunner.assertInRange(roll, 1, 6, `d6 roll ${i + 1} is between 1 and 6`);
    }

    // Test d8 rolls are in range
    for (let i = 0; i < 100; i++) {
        const roll = rollDie(8);
        TestRunner.assertInRange(roll, 1, 8, `d8 roll ${i + 1} is between 1 and 8`);
    }

    // Test d20 rolls are in range
    for (let i = 0; i < 50; i++) {
        const roll = rollDie(20);
        TestRunner.assertInRange(roll, 1, 20, `d20 roll ${i + 1} is between 1 and 20`);
    }
}

// ============================================
// TESTS: generateDicePool
// ============================================

function testGenerateDicePool() {
    console.log('\n--- Testing generateDicePool ---');

    // Test null notation
    let result = generateDicePool(null, 4);
    TestRunner.assertEqual(result.dice.length, 0, 'Null notation produces empty pool');

    // Test per-figure dice generation
    const notation1 = { perFigure: [{ count: 1, faces: 6, perFigures: 1 }], flat: [] };
    result = generateDicePool(notation1, 4);
    TestRunner.assertEqual(result.dice.length, 4, '1d6/1f with 4 figures produces 4 dice');
    TestRunner.assertEqual(result.composition, [6, 6, 6, 6], 'Composition is all d6');

    // Test 2d6/1f with 4 figures
    const notation2 = { perFigure: [{ count: 2, faces: 6, perFigures: 1 }], flat: [] };
    result = generateDicePool(notation2, 4);
    TestRunner.assertEqual(result.dice.length, 8, '2d6/1f with 4 figures produces 8 dice');

    // Test per 2 figures
    const notation3 = { perFigure: [{ count: 1, faces: 8, perFigures: 2 }], flat: [] };
    result = generateDicePool(notation3, 4);
    TestRunner.assertEqual(result.dice.length, 2, '1d8/2f with 4 figures produces 2 dice');

    // Test flat dice
    const notation4 = { perFigure: [], flat: [{ count: 2, faces: 8 }] };
    result = generateDicePool(notation4, 4);
    TestRunner.assertEqual(result.dice.length, 2, 'Flat 2d8 produces 2 dice regardless of figures');

    // Test combined
    const notation5 = { 
        perFigure: [{ count: 1, faces: 6, perFigures: 1 }], 
        flat: [{ count: 1, faces: 8 }] 
    };
    result = generateDicePool(notation5, 4);
    TestRunner.assertEqual(result.dice.length, 5, '1d6/1f + 1d8 with 4 figures produces 5 dice');

    // Verify dice values are valid
    for (const die of result.dice) {
        TestRunner.assertInRange(die.value, 1, die.faces, `Die value is within range for d${die.faces}`);
    }
}

// ============================================
// TESTS: getMostProminentDieType
// ============================================

function testGetMostProminentDieType() {
    console.log('\n--- Testing getMostProminentDieType ---');

    TestRunner.assertEqual(getMostProminentDieType([6, 6, 6, 6]), 6, 'All d6 returns 6');
    TestRunner.assertEqual(getMostProminentDieType([8, 8, 8]), 8, 'All d8 returns 8');
    TestRunner.assertEqual(getMostProminentDieType([6, 6, 6, 8]), 6, 'More d6 than d8 returns 6');
    TestRunner.assertEqual(getMostProminentDieType([6, 8, 8, 8]), 8, 'More d8 than d6 returns 8');
    TestRunner.assertEqual(getMostProminentDieType([]), 6, 'Empty array returns default 6');

    // Test tie (result should be one of the tied types)
    const tieResult = getMostProminentDieType([6, 6, 8, 8]);
    TestRunner.assert(tieResult === 6 || tieResult === 8, 'Tie returns one of the tied types');
}

// ============================================
// TESTS: applyIndirectFire
// ============================================

function testApplyIndirectFire() {
    console.log('\n--- Testing applyIndirectFire ---');

    // Test d8 to d6 conversion
    const pool1 = {
        dice: [
            { value: 7, faces: 8 },
            { value: 5, faces: 8 },
            { value: 3, faces: 6 }
        ],
        composition: [8, 8, 6]
    };
    const conversions = applyIndirectFire(pool1);
    TestRunner.assertEqual(conversions, 2, '2 d8 dice converted');
    TestRunner.assertEqual(pool1.dice[0].faces, 6, 'First die converted to d6');
    TestRunner.assertEqual(pool1.dice[1].faces, 6, 'Second die converted to d6');
    TestRunner.assertEqual(pool1.dice[2].faces, 6, 'Third die unchanged (was already d6)');
    TestRunner.assertEqual(pool1.composition, [6, 6, 6], 'Composition updated');

    // Verify converted dice values are valid d6
    TestRunner.assertInRange(pool1.dice[0].value, 1, 6, 'Converted die 1 has valid d6 value');
    TestRunner.assertInRange(pool1.dice[1].value, 1, 6, 'Converted die 2 has valid d6 value');

    // Test no d8 in pool
    const pool2 = {
        dice: [{ value: 4, faces: 6 }],
        composition: [6]
    };
    const conversions2 = applyIndirectFire(pool2);
    TestRunner.assertEqual(conversions2, 0, 'No conversions when no d8 present');
}

// ============================================
// TESTS: scrudCompare
// ============================================

function testScrudCompare() {
    console.log('\n--- Testing scrudCompare ---');

    // Pool A wins all
    let poolA = [{ value: 6 }, { value: 5 }, { value: 4 }];
    let poolB = [{ value: 3 }, { value: 2 }, { value: 1 }];
    let result = scrudCompare(poolA, poolB);
    TestRunner.assertEqual(result.winsA, 3, 'Pool A wins all 3 comparisons');
    TestRunner.assertEqual(result.winsB, 0, 'Pool B wins 0 comparisons');

    // Pool B wins all
    poolA = [{ value: 1 }, { value: 2 }, { value: 3 }];
    poolB = [{ value: 6 }, { value: 5 }, { value: 4 }];
    result = scrudCompare(poolA, poolB);
    TestRunner.assertEqual(result.winsA, 0, 'Pool A wins 0 comparisons');
    TestRunner.assertEqual(result.winsB, 3, 'Pool B wins all 3 comparisons');

    // Mixed results
    poolA = [{ value: 6 }, { value: 2 }];
    poolB = [{ value: 4 }, { value: 5 }];
    result = scrudCompare(poolA, poolB);
    TestRunner.assertEqual(result.winsA, 1, 'Pool A wins 1 (6 vs 5)');
    TestRunner.assertEqual(result.winsB, 1, 'Pool B wins 1 (4 vs 2)');

    // Ties are discarded
    poolA = [{ value: 5 }, { value: 5 }];
    poolB = [{ value: 5 }, { value: 3 }];
    result = scrudCompare(poolA, poolB);
    TestRunner.assertEqual(result.winsA, 1, 'Pool A wins 1 (5 vs 3)');
    TestRunner.assertEqual(result.winsB, 0, 'Pool B wins 0 (tie is discarded)');

    // Unequal pool sizes (compare only up to smaller size)
    poolA = [{ value: 6 }, { value: 5 }, { value: 4 }, { value: 3 }];
    poolB = [{ value: 1 }, { value: 1 }];
    result = scrudCompare(poolA, poolB);
    TestRunner.assertEqual(result.winsA, 2, 'Only 2 comparisons made (smaller pool size)');

    // Empty pools
    result = scrudCompare([], []);
    TestRunner.assertEqual(result.winsA, 0, 'Empty pools: A wins 0');
    TestRunner.assertEqual(result.winsB, 0, 'Empty pools: B wins 0');
}

// ============================================
// TESTS: applyBonus
// ============================================

function testApplyBonus() {
    console.log('\n--- Testing applyBonus ---');

    // Test 'none' bonus type
    let pool = [{ value: 3, faces: 6 }, { value: 2, faces: 6 }];
    let composition = [6, 6];
    let result = applyBonus(pool, composition, 'none');
    TestRunner.assertEqual(result.bonusDiceRolled, 0, 'No bonus dice rolled with "none"');
    TestRunner.assertEqual(result.substitutions, 0, 'No substitutions with "none"');

    // Test 'standard' (50%) bonus
    pool = [
        { value: 1, faces: 6 },
        { value: 2, faces: 6 },
        { value: 3, faces: 6 },
        { value: 4, faces: 6 }
    ];
    composition = [6, 6, 6, 6];
    result = applyBonus(pool, composition, 'standard');
    TestRunner.assertEqual(result.bonusDiceRolled, 2, '50% of 4 dice = 2 bonus dice');

    // Test 'double' (100%) bonus
    pool = [
        { value: 1, faces: 6 },
        { value: 2, faces: 6 },
        { value: 3, faces: 6 },
        { value: 4, faces: 6 }
    ];
    composition = [6, 6, 6, 6];
    result = applyBonus(pool, composition, 'double');
    TestRunner.assertEqual(result.bonusDiceRolled, 4, '100% of 4 dice = 4 bonus dice');

    // Test minimum 1 bonus die
    pool = [{ value: 1, faces: 6 }];
    composition = [6];
    result = applyBonus(pool, composition, 'standard');
    TestRunner.assertEqual(result.bonusDiceRolled, 1, 'Minimum 1 bonus die rolled');

    // Test empty pool
    result = applyBonus([], [], 'standard');
    TestRunner.assertEqual(result.bonusDiceRolled, 0, 'No bonus dice for empty pool');
}

// ============================================
// TESTS: calculateSigmaStats
// ============================================

function testCalculateSigmaStats() {
    console.log('\n--- Testing calculateSigmaStats ---');

    // Test empty data
    TestRunner.assertEqual(calculateSigmaStats([]), null, 'Empty array returns null');

    // Test simple data
    const data1 = [1, 2, 3, 4, 5];
    const result1 = calculateSigmaStats(data1);
    TestRunner.assertEqual(result1.mean, 3, 'Mean of [1,2,3,4,5] is 3');
    TestRunner.assertEqual(result1.min, 1, 'Min is 1');
    TestRunner.assertEqual(result1.max, 5, 'Max is 5');

    // Test uniform data
    const data2 = [5, 5, 5, 5, 5];
    const result2 = calculateSigmaStats(data2);
    TestRunner.assertEqual(result2.mean, 5, 'Mean of all 5s is 5');
    TestRunner.assertEqual(result2.stdDev, 0, 'StdDev of uniform data is 0');

    // Test sigma ranges exist
    TestRunner.assert(result1.sigma1 !== undefined, 'sigma1 range exists');
    TestRunner.assert(result1.sigma2 !== undefined, 'sigma2 range exists');
    TestRunner.assert(result1.sigma3 !== undefined, 'sigma3 range exists');
}

// ============================================
// TESTS: describeDicePool
// ============================================

function testDescribeDicePool() {
    console.log('\n--- Testing describeDicePool ---');

    TestRunner.assertEqual(describeDicePool(null), '', 'Null returns empty string');

    const parsed1 = { perFigure: [{ count: 2, faces: 6, perFigures: 1 }], flat: [] };
    TestRunner.assertEqual(describeDicePool(parsed1), '2d6 per 1 fig', 'Describes perFigure correctly');

    const parsed2 = { perFigure: [], flat: [{ count: 1, faces: 8 }] };
    TestRunner.assertEqual(describeDicePool(parsed2), '1d8 flat', 'Describes flat correctly');

    const parsed3 = {
        perFigure: [{ count: 2, faces: 6, perFigures: 1 }],
        flat: [{ count: 1, faces: 8 }]
    };
    TestRunner.assertEqual(describeDicePool(parsed3), '2d6 per 1 fig + 1d8 flat', 'Describes combined correctly');
}

// ============================================
// TESTS: simulateMelee (integration)
// ============================================

function testSimulateMelee() {
    console.log('\n--- Testing simulateMelee ---');

    const attacker = {
        name: 'Test Attacker',
        figures: 4,
        melee: '1d6/1f'
    };

    const defender = {
        name: 'Test Defender',
        figures: 4,
        melee: '1d6/1f'
    };

    const attackerOpts = { bonusType: 'none' };
    const defenderOpts = { bonusType: 'none' };

    // Run multiple simulations to check structure
    for (let i = 0; i < 10; i++) {
        const result = simulateMelee(attacker, defender, attackerOpts, defenderOpts);

        TestRunner.assert(result !== null, `Simulation ${i + 1} returns result`);
        TestRunner.assert(['attacker', 'defender', 'draw'].includes(result.winner), `Winner is valid: ${result.winner}`);
        TestRunner.assertInRange(result.attackerDice, 4, 4, 'Attacker has 4 dice');
        TestRunner.assertInRange(result.defenderDice, 4, 4, 'Defender has 4 dice');
        TestRunner.assertInRange(result.defenderCasualties, 0, 4, 'Defender casualties in range');
        TestRunner.assertInRange(result.attackerCasualties, 0, 4, 'Attacker casualties in range');
    }

    // Test with invalid notation
    const invalidAttacker = { ...attacker, melee: 'invalid' };
    const result = simulateMelee(invalidAttacker, defender, attackerOpts, defenderOpts);
    TestRunner.assertEqual(result, null, 'Invalid notation returns null');
}

// ============================================
// TESTS: simulateMissile (integration)
// ============================================

function testSimulateMissile() {
    console.log('\n--- Testing simulateMissile ---');

    const attacker = {
        name: 'Test Archer',
        figures: 4,
        missile: '1d8/1f'
    };

    const defender = {
        name: 'Test Target',
        figures: 4,
        dodge: '1d6/1f'
    };

    const attackerOpts = { bonusType: 'none', isArtillery: false, isIndirectFire: false };
    const defenderOpts = { bonusType: 'none' };

    // Run multiple simulations
    for (let i = 0; i < 10; i++) {
        const result = simulateMissile(attacker, defender, attackerOpts, defenderOpts);

        TestRunner.assert(result !== null, `Missile simulation ${i + 1} returns result`);
        TestRunner.assert(['attacker', 'defender', 'draw'].includes(result.winner), `Winner is valid: ${result.winner}`);
        TestRunner.assertEqual(result.attackerCasualties, 0, 'Attacker takes no casualties in missile');
        TestRunner.assertInRange(result.attackerSuccessfulShots, 0, 4, 'Successful shots in range');
    }

    // Test artillery (2x casualties)
    const artilleryOpts = { bonusType: 'none', isArtillery: true, isIndirectFire: false };
    let artilleryResult = simulateMissile(attacker, defender, artilleryOpts, defenderOpts);
    // Artillery doubles casualties, so if any hits landed, casualties should be even
    if (artilleryResult.attackerWins > 0) {
        TestRunner.assertEqual(
            artilleryResult.defenderCasualties % 2, 0,
            'Artillery casualties are even (2x per hit)'
        );
    }
}

// ============================================
// TESTS: addToHistory
// ============================================

function testAddToHistory() {
    console.log('\n--- Testing addToHistory ---');

    // Clear history first
    simulationHistory.length = 0;

    // Add an entry
    const attackerOpts = { bonusType: 'standard', isArtillery: false, isIndirectFire: false };
    addToHistory(
        'melee',           // mode
        '2d6/1f',          // attackerRoll
        '1d6/1f',          // defenderRoll
        55.5,              // attackerPct
        30.2,              // defenderPct
        14.3,              // drawPct
        attackerOpts,      // attackerOpts
        'Heavy Infantry',  // attackerName
        'Spearmen',        // defenderName
        4,                 // attackerFigures
        4,                 // defenderFigures
        1.52,              // avgAttackerCasualties
        0.98               // avgDefenderCasualties
    );

    TestRunner.assertEqual(simulationHistory.length, 1, 'History has 1 entry after addToHistory');

    const entry = simulationHistory[0];
    TestRunner.assertEqual(entry.mode, 'melee', 'Entry mode is melee');
    TestRunner.assertEqual(entry.attackerRoll, '2d6/1f', 'Entry attackerRoll is correct');
    TestRunner.assertEqual(entry.defenderRoll, '1d6/1f', 'Entry defenderRoll is correct');
    TestRunner.assertEqual(entry.attackerName, 'Heavy Infantry', 'Entry attackerName is correct');
    TestRunner.assertEqual(entry.defenderName, 'Spearmen', 'Entry defenderName is correct');
    TestRunner.assertEqual(entry.attackerFigures, 4, 'Entry attackerFigures is 4');
    TestRunner.assertEqual(entry.defenderFigures, 4, 'Entry defenderFigures is 4');
    TestRunner.assertEqual(entry.avgAttackerCasualties, '1.52', 'Entry avgAttackerCasualties is formatted');
    TestRunner.assertEqual(entry.avgDefenderCasualties, '0.98', 'Entry avgDefenderCasualties is formatted');
    TestRunner.assertEqual(entry.attackerPct, '55.5', 'Entry attackerPct is formatted');
    TestRunner.assertEqual(entry.defenderPct, '30.2', 'Entry defenderPct is formatted');
    TestRunner.assertEqual(entry.drawPct, '14.3', 'Entry drawPct is formatted');
    TestRunner.assertEqual(entry.attackerBonus, 'standard', 'Entry attackerBonus is correct');
    TestRunner.assert(entry.id > 0, 'Entry has valid id');
    TestRunner.assert(entry.timestamp !== undefined, 'Entry has timestamp');

    // Test history limit (max 20 entries)
    for (let i = 0; i < 25; i++) {
        addToHistory('melee', '1d6/1f', '1d6/1f', 50, 50, 0, attackerOpts, '', '', 4, 4, 1, 1);
    }
    TestRunner.assertEqual(simulationHistory.length, 20, 'History is capped at 20 entries');

    // Clean up
    simulationHistory.length = 0;
}

// ============================================
// TESTS: clearHistory
// ============================================

function testClearHistory() {
    console.log('\n--- Testing clearHistory ---');

    // Add some entries
    const attackerOpts = { bonusType: 'none', isArtillery: false, isIndirectFire: false };
    addToHistory('melee', '1d6/1f', '1d6/1f', 50, 50, 0, attackerOpts, '', '', 4, 4, 1, 1);
    addToHistory('melee', '1d6/1f', '1d6/1f', 50, 50, 0, attackerOpts, '', '', 4, 4, 1, 1);

    TestRunner.assert(simulationHistory.length > 0, 'History has entries before clear');

    clearHistory();

    TestRunner.assertEqual(simulationHistory.length, 0, 'History is empty after clearHistory');
}

// ============================================
// TESTS: toggleRulesModal
// ============================================

function testToggleRulesModal() {
    console.log('\n--- Testing toggleRulesModal ---');

    const modal = document.getElementById('rules-modal');
    if (!modal) {
        // Skip test when running in tests.html (no modal element)
        console.log('  (skipped - rules-modal not in DOM)');
        TestRunner.assert(true, 'toggleRulesModal skipped - not in main page context');
        return;
    }

    // Ensure modal is hidden initially
    modal.classList.remove('visible');

    // Toggle open
    toggleRulesModal();
    TestRunner.assert(modal.classList.contains('visible'), 'Modal is visible after first toggle');

    // Toggle closed
    toggleRulesModal();
    TestRunner.assert(!modal.classList.contains('visible'), 'Modal is hidden after second toggle');
}

// ============================================
// RUN ALL TESTS
// ============================================

function runAllTests() {
    console.log('==========================================');
    console.log('MINUTE MIGHT BALANCER - TEST SUITE');
    console.log('==========================================');

    testParseDiceNotation();
    testValidateDiceNotation();
    testRollDie();
    testGenerateDicePool();
    testGetMostProminentDieType();
    testApplyIndirectFire();
    testScrudCompare();
    testApplyBonus();
    testCalculateSigmaStats();
    testDescribeDicePool();
    testSimulateMelee();
    testSimulateMissile();
    testAddToHistory();
    testClearHistory();
    testToggleRulesModal();

    return TestRunner.report();
}

// Auto-run if in Node.js environment or if explicitly called
if (typeof window === 'undefined') {
    // Node.js environment - would need imports
    console.log('Note: For Node.js, require the script.js functions first');
} else if (typeof runAllTests === 'function') {
    // Browser environment - tests can be run manually
    console.log('Tests loaded. Call runAllTests() to execute.');
}
