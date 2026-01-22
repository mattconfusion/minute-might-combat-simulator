// ============================================
// DICE NOTATION PARSER
// Format: [dice]d[faces]/[figures]f + [dice]d[faces]
// ============================================

function parseDiceNotation(str) {
    if (!str || str.trim() === '') return null;
    
    const result = {
        perFigure: [],  // Array of {count, faces}
        flat: []        // Array of {count, faces}
    };
    
    // Split by + to separate components
    const parts = str.toLowerCase().replace(/\s/g, '').split('+');
    
    for (const part of parts) {
        // Match dice notation: NdF/Mf or just NdF
        const perFigureMatch = part.match(/(\d+)d(\d+)\/(\d+)f/);
        const flatMatch = part.match(/^(\d+)d(\d+)$/);
        
        if (perFigureMatch) {
            result.perFigure.push({
                count: parseInt(perFigureMatch[1]),
                faces: parseInt(perFigureMatch[2]),
                perFigures: parseInt(perFigureMatch[3])
            });
        } else if (flatMatch) {
            result.flat.push({
                count: parseInt(flatMatch[1]),
                faces: parseInt(flatMatch[2])
            });
        }
    }
    
    return (result.perFigure.length > 0 || result.flat.length > 0) ? result : null;
}

// ============================================
// DICE POOL GENERATION
// ============================================

function rollDie(faces) {
    return Math.floor(Math.random() * faces) + 1;
}

function generateDicePool(notation, figures) {
    if (!notation) return { dice: [], composition: [] };
    
    const dice = [];
    const composition = []; // Track die types for bonus calculation
    
    // Per-figure dice
    for (const spec of notation.perFigure) {
        const totalDice = Math.floor(figures / spec.perFigures) * spec.count;
        for (let i = 0; i < totalDice; i++) {
            dice.push({ value: rollDie(spec.faces), faces: spec.faces });
            composition.push(spec.faces);
        }
    }
    
    // Flat dice
    for (const spec of notation.flat) {
        for (let i = 0; i < spec.count; i++) {
            dice.push({ value: rollDie(spec.faces), faces: spec.faces });
            composition.push(spec.faces);
        }
    }
    
    return { dice, composition };
}

function getMostProminentDieType(composition) {
    const counts = {};
    for (const faces of composition) {
        counts[faces] = (counts[faces] || 0) + 1;
    }
    
    let maxCount = 0;
    let prominentTypes = [];
    
    for (const [faces, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            prominentTypes = [parseInt(faces)];
        } else if (count === maxCount) {
            prominentTypes.push(parseInt(faces));
        }
    }
    
    // If tie, randomly select
    if (prominentTypes.length > 1) {
        return prominentTypes[Math.floor(Math.random() * prominentTypes.length)];
    }
    
    return prominentTypes[0] || 6;
}

// Apply indirect fire conversion: d8 → d6
function applyIndirectFire(dicePool) {
    let conversions = 0;
    for (const die of dicePool.dice) {
        if (die.faces === 8) {
            die.faces = 6;
            die.value = rollDie(6);  // Re-roll with d6
            conversions++;
        }
    }
    // Update composition
    dicePool.composition = dicePool.composition.map(f => f === 8 ? 6 : f);
    return conversions;
}

// ============================================
// BONUS DICE APPLICATION
// ============================================

// bonusType: 'none', 'standard' (50%), 'double' (100%)
function applyBonus(mainPool, composition, bonusTypeOption) {
    let bonusDice = [];
    let bonusDieType = null;
    let substitutions = 0;
    
    if (bonusTypeOption !== 'none' && mainPool.length > 0) {
        // Calculate bonus dice count based on type
        let bonusMultiplier = bonusTypeOption === 'double' ? 1.0 : 0.5;
        let bonusCount = Math.floor(mainPool.length * bonusMultiplier);
        bonusCount = Math.max(1, bonusCount);  // Minimum 1 bonus die
        
        bonusDieType = getMostProminentDieType(composition);
        
        for (let i = 0; i < bonusCount; i++) {
            bonusDice.push({ value: rollDie(bonusDieType), faces: bonusDieType });
        }
    }
    
    // Apply substitution - replace lowest main dice of matching type with better bonus dice
    if (bonusDice.length > 0 && bonusDieType) {
        // Get main dice of matching type, sorted ascending
        const matchingIndices = [];
        for (let i = 0; i < mainPool.length; i++) {
            if (mainPool[i].faces === bonusDieType) {
                matchingIndices.push(i);
            }
        }
        
        matchingIndices.sort((a, b) => mainPool[a].value - mainPool[b].value);
        
        // Sort bonus dice descending
        bonusDice.sort((a, b) => b.value - a.value);
        
        // Substitute
        for (let i = 0; i < bonusDice.length && i < matchingIndices.length; i++) {
            const mainIdx = matchingIndices[i];
            if (bonusDice[i].value > mainPool[mainIdx].value) {
                mainPool[mainIdx].value = bonusDice[i].value;
                mainPool[mainIdx].wasBonus = true;
                substitutions++;
            }
        }
    }
    
    return { bonusDiceRolled: bonusDice.length, substitutions };
}

// ============================================
// SCRUD COMPARISON
// ============================================

function scrudCompare(poolA, poolB) {
    // Sort both pools descending
    const sortedA = [...poolA].sort((a, b) => b.value - a.value);
    const sortedB = [...poolB].sort((a, b) => b.value - a.value);
    
    const minLength = Math.min(sortedA.length, sortedB.length);
    
    let winsA = 0;
    let winsB = 0;
    
    for (let i = 0; i < minLength; i++) {
        if (sortedA[i].value > sortedB[i].value) {
            winsA++;
        } else if (sortedB[i].value > sortedA[i].value) {
            winsB++;
        }
        // Draws are discarded
    }
    
    return { winsA, winsB };
}

// ============================================
// COMBAT SIMULATIONS
// ============================================

function simulateMelee(attacker, defender, attackerOpts, defenderOpts) {
    const attackerNotation = parseDiceNotation(attacker.melee);
    const defenderNotation = parseDiceNotation(defender.melee);
    
    if (!attackerNotation || !defenderNotation) {
        return null;
    }
    
    // Generate dice pools
    const attackerPool = generateDicePool(attackerNotation, attacker.figures);
    const defenderPool = generateDicePool(defenderNotation, defender.figures);
    
    // Apply bonuses
    const attackerBonusStats = applyBonus(
        attackerPool.dice,
        attackerPool.composition,
        attackerOpts.bonusType
    );
    
    const defenderBonusStats = applyBonus(
        defenderPool.dice,
        defenderPool.composition,
        defenderOpts.bonusType
    );
    
    // SCRUD comparison
    const { winsA, winsB } = scrudCompare(attackerPool.dice, defenderPool.dice);
    
    // Determine winner
    let winner = 'draw';
    if (winsA > winsB) winner = 'attacker';
    else if (winsB > winsA) winner = 'defender';
    
    return {
        winner,
        attackerCasualties: winsB,  // Defender wins = attacker casualties
        defenderCasualties: winsA,  // Attacker wins = defender casualties
        attackerWins: winsA,
        defenderWins: winsB,
        attackerDice: attackerPool.dice.length,
        defenderDice: defenderPool.dice.length,
        attackerBonusRolled: attackerBonusStats.bonusDiceRolled,
        defenderBonusRolled: defenderBonusStats.bonusDiceRolled,
        attackerSubs: attackerBonusStats.substitutions,
        defenderSubs: defenderBonusStats.substitutions,
        attackerHighest: attackerPool.dice.length > 0 ? Math.max(...attackerPool.dice.map(d => d.value)) : 0,
        defenderHighest: defenderPool.dice.length > 0 ? Math.max(...defenderPool.dice.map(d => d.value)) : 0,
        attackerAvg: attackerPool.dice.length > 0 ? attackerPool.dice.reduce((s, d) => s + d.value, 0) / attackerPool.dice.length : 0,
        defenderAvg: defenderPool.dice.length > 0 ? defenderPool.dice.reduce((s, d) => s + d.value, 0) / defenderPool.dice.length : 0,
        attackerSuccessfulShots: 0,  // Not applicable for melee
        defenderDodges: 0,           // Not applicable for melee
        tiedComparisons: 0           // Could be calculated but not shown for melee
    };
}

function simulateMissile(attacker, defender, attackerOpts, defenderOpts) {
    const attackerNotation = parseDiceNotation(attacker.missile);
    const defenderNotation = parseDiceNotation(defender.dodge);
    
    if (!attackerNotation || !defenderNotation) {
        return null;
    }
    
    // Generate attacker dice pool
    const attackerPool = generateDicePool(attackerNotation, attacker.figures);
    
    // Apply indirect fire conversion (d8 → d6) if enabled
    let indirectConversions = 0;
    if (attackerOpts.isIndirectFire) {
        indirectConversions = applyIndirectFire(attackerPool);
    }
    
    // Apply attacker bonuses
    const attackerBonusStats = applyBonus(
        attackerPool.dice,
        attackerPool.composition,
        attackerOpts.bonusType
    );
    
    // Filter for 5+ results
    const successfulShots = attackerPool.dice.filter(d => d.value >= 5);
    
    if (successfulShots.length === 0) {
        return {
            winner: 'defender',
            attackerCasualties: 0,
            defenderCasualties: 0,
            attackerWins: 0,
            defenderWins: 0,
            attackerDice: attackerPool.dice.length,
            defenderDice: 0,
            attackerBonusRolled: attackerBonusStats.bonusDiceRolled,
            defenderBonusRolled: 0,
            attackerSubs: attackerBonusStats.substitutions,
            defenderSubs: 0,
            attackerHighest: attackerPool.dice.length > 0 ? Math.max(...attackerPool.dice.map(d => d.value)) : 0,
            defenderHighest: 0,
            attackerAvg: attackerPool.dice.length > 0 ? attackerPool.dice.reduce((s, d) => s + d.value, 0) / attackerPool.dice.length : 0,
            defenderAvg: 0,
            attackerSuccessfulShots: 0,
            defenderDodges: 0,
            tiedComparisons: 0
        };
    }
    
    // Calculate max defender dice based on figures
    let maxDefenderDice = 0;
    for (const spec of defenderNotation.perFigure) {
        maxDefenderDice += Math.floor(defender.figures / spec.perFigures) * spec.count;
    }
    for (const spec of defenderNotation.flat) {
        maxDefenderDice += spec.count;
    }
    
    // Defender rolls dice equal to successful shots, limited by max
    const defenderDiceCount = Math.min(successfulShots.length, maxDefenderDice);
    
    // Generate defender pool manually
    const defenderPool = { dice: [], composition: [] };
    
    // Use the most prominent die type from defender notation
    let defenderDieType = 6;
    if (defenderNotation.perFigure.length > 0) {
        defenderDieType = defenderNotation.perFigure[0].faces;
    } else if (defenderNotation.flat.length > 0) {
        defenderDieType = defenderNotation.flat[0].faces;
    }
    
    for (let i = 0; i < defenderDiceCount; i++) {
        defenderPool.dice.push({ value: rollDie(defenderDieType), faces: defenderDieType });
        defenderPool.composition.push(defenderDieType);
    }
    
    // Apply defender bonuses
    const defenderBonusStats = applyBonus(
        defenderPool.dice,
        defenderPool.composition,
        defenderOpts.bonusType
    );
    
    // SCRUD comparison using successful shots vs defender pool
    const { winsA, winsB } = scrudCompare(successfulShots, defenderPool.dice);
    
    // In missile fire, only attacker wins cause casualties
    // Artillery causes 2 casualties per hit instead of 1
    const casualtyMultiplier = attackerOpts.isArtillery ? 2 : 1;
    const defenderCasualties = winsA * casualtyMultiplier;
    
    let winner = 'draw';
    if (winsA > winsB) winner = 'attacker';
    else if (winsB > winsA) winner = 'defender';
    
    return {
        winner,
        attackerCasualties: 0,  // Defender cannot cause casualties in missile fire
        defenderCasualties: defenderCasualties,  // Attacker hits × multiplier
        attackerWins: winsA,  // Hits that got through
        defenderWins: winsB,  // Successful dodges
        attackerDice: attackerPool.dice.length,
        defenderDice: defenderPool.dice.length,
        attackerBonusRolled: attackerBonusStats.bonusDiceRolled,
        defenderBonusRolled: defenderBonusStats.bonusDiceRolled,
        attackerSubs: attackerBonusStats.substitutions,
        defenderSubs: defenderBonusStats.substitutions,
        attackerHighest: attackerPool.dice.length > 0 ? Math.max(...attackerPool.dice.map(d => d.value)) : 0,
        defenderHighest: defenderPool.dice.length > 0 ? Math.max(...defenderPool.dice.map(d => d.value)) : 0,
        attackerAvg: attackerPool.dice.length > 0 ? attackerPool.dice.reduce((s, d) => s + d.value, 0) / attackerPool.dice.length : 0,
        defenderAvg: defenderPool.dice.length > 0 ? defenderPool.dice.reduce((s, d) => s + d.value, 0) / defenderPool.dice.length : 0,
        attackerSuccessfulShots: successfulShots.length,
        defenderDodges: winsB,  // Successful dodges by defender
        tiedComparisons: Math.min(successfulShots.length, defenderPool.dice.length) - winsA - winsB
    };
}

// ============================================
// MONTE CARLO RUNNER
// ============================================

function runMonteCarlo(n, combatFn, attacker, defender, attackerOpts, defenderOpts) {
    const results = {
        attackerWins: 0,
        defenderWins: 0,
        draws: 0,
        attackerCasualties: [],
        defenderCasualties: [],
        totalAttackerWins: 0,
        totalDefenderWins: 0,
        totalAttackerDice: 0,
        totalDefenderDice: 0,
        totalAttackerBonusRolled: 0,
        totalDefenderBonusRolled: 0,
        totalAttackerSubs: 0,
        totalDefenderSubs: 0,
        totalAttackerHighest: 0,
        totalDefenderHighest: 0,
        totalAttackerAvg: 0,
        totalDefenderAvg: 0,
        totalAttackerSuccessfulShots: 0,
        totalDefenderDodges: 0,
        totalTiedComparisons: 0,
        defenderDodgesDistribution: [],
        validSimulations: 0
    };
    
    for (let i = 0; i < n; i++) {
        const result = combatFn(attacker, defender, attackerOpts, defenderOpts);
        
        if (!result) continue;
        
        results.validSimulations++;
        
        if (result.winner === 'attacker') results.attackerWins++;
        else if (result.winner === 'defender') results.defenderWins++;
        else results.draws++;
        
        results.attackerCasualties.push(result.defenderCasualties);
        results.defenderCasualties.push(result.attackerCasualties);
        
        results.totalAttackerWins += result.attackerWins;
        results.totalDefenderWins += result.defenderWins;
        results.totalAttackerDice += result.attackerDice;
        results.totalDefenderDice += result.defenderDice;
        results.totalAttackerBonusRolled += result.attackerBonusRolled;
        results.totalDefenderBonusRolled += result.defenderBonusRolled;
        results.totalAttackerSubs += result.attackerSubs;
        results.totalDefenderSubs += result.defenderSubs;
        results.totalAttackerHighest += result.attackerHighest;
        results.totalDefenderHighest += result.defenderHighest;
        results.totalAttackerAvg += result.attackerAvg;
        results.totalDefenderAvg += result.defenderAvg;
        results.totalAttackerSuccessfulShots += result.attackerSuccessfulShots || 0;
        results.totalDefenderDodges += result.defenderDodges || 0;
        results.totalTiedComparisons += result.tiedComparisons || 0;
        results.defenderDodgesDistribution.push(result.defenderDodges || 0);
    }
    
    return results;
}

// ============================================
// CHART RENDERING
// ============================================

function renderVictoryChart(results) {
    const total = results.validSimulations;
    if (total === 0) return;
    
    const attackerPct = (results.attackerWins / total * 100);
    const defenderPct = (results.defenderWins / total * 100);
    const drawPct = (results.draws / total * 100);
    
    const maxPct = Math.max(attackerPct, defenderPct, drawPct, 1);
    
    document.getElementById('bar-attacker').style.height = `${(attackerPct / maxPct) * 140}px`;
    document.getElementById('bar-defender').style.height = `${(defenderPct / maxPct) * 140}px`;
    document.getElementById('bar-draw').style.height = `${(drawPct / maxPct) * 140}px`;
    
    document.getElementById('val-attacker').textContent = `${attackerPct.toFixed(1)}%`;
    document.getElementById('val-defender').textContent = `${defenderPct.toFixed(1)}%`;
    document.getElementById('val-draw').textContent = `${drawPct.toFixed(1)}%`;
}

function calculateSigmaStats(data) {
    if (data.length === 0) return null;
    
    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    return {
        mean,
        stdDev,
        min,
        max,
        sigma1: { low: Math.max(0, mean - stdDev), high: mean + stdDev },
        sigma2: { low: Math.max(0, mean - 2 * stdDev), high: mean + 2 * stdDev },
        sigma3: { low: Math.max(0, mean - 3 * stdDev), high: mean + 3 * stdDev }
    };
}

function renderSigmaStats(prefix, stats, cssClass) {
    if (!stats) return;
    
    document.getElementById(`sigma-${prefix}-mean`).textContent = stats.mean.toFixed(2);
    document.getElementById(`sigma-${prefix}-std`).textContent = stats.stdDev.toFixed(2);
    document.getElementById(`sigma-${prefix}-min`).textContent = stats.min;
    document.getElementById(`sigma-${prefix}-max`).textContent = stats.max;
    
    document.getElementById(`sigma-${prefix}-1s`).textContent = 
        `${stats.sigma1.low.toFixed(1)} - ${stats.sigma1.high.toFixed(1)}`;
    document.getElementById(`sigma-${prefix}-2s`).textContent = 
        `${stats.sigma2.low.toFixed(1)} - ${stats.sigma2.high.toFixed(1)}`;
    document.getElementById(`sigma-${prefix}-3s`).textContent = 
        `${stats.sigma3.low.toFixed(1)} - ${stats.sigma3.high.toFixed(1)}`;
}

function renderHistogram(containerId, data, cssClass, sigmaStats) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (data.length === 0) return;
    
    const maxVal = Math.max(...data);
    const bins = {};
    
    for (let i = 0; i <= maxVal; i++) {
        bins[i] = 0;
    }
    
    for (const val of data) {
        bins[val]++;
    }
    
    const maxCount = Math.max(...Object.values(bins), 1);
    const meanBin = sigmaStats ? Math.round(sigmaStats.mean) : -1;
    
    for (let i = 0; i <= maxVal; i++) {
        const bar = document.createElement('div');
        const isMean = (i === meanBin);
        bar.className = `histogram-bar ${cssClass}${isMean ? ' mean-marker' : ''}`;
        bar.style.height = `${(bins[i] / maxCount) * 110}px`;
        
        const pct = (bins[i] / data.length * 100).toFixed(1);
        bar.title = `${i}: ${bins[i]} times (${pct}%)${isMean ? ' ← Mean' : ''}`;
        
        // Add label for every bar or just key ones
        const label = document.createElement('span');
        label.className = 'histogram-bar-label';
        label.textContent = i;
        bar.appendChild(label);
        
        container.appendChild(bar);
    }
}

// ============================================
// MAIN SIMULATION RUNNER
// ============================================

function showLoading(show, message) {
    const overlay = document.getElementById('loading-overlay');
    const progressText = document.getElementById('loading-progress');
    
    if (show) {
        progressText.textContent = message || 'Running simulations...';
        overlay.classList.add('visible');
    } else {
        overlay.classList.remove('visible');
    }
}

function runSimulation() {
    const mode = document.querySelector('input[name="combat-mode"]:checked').value;
    let simCount = parseInt(document.getElementById('sim-count').value) || 10000;
    
    // Validate and clamp simulation count
    const MIN_SIMS = 100;
    const MAX_SIMS = 50000;
    
    if (simCount < MIN_SIMS) {
        simCount = MIN_SIMS;
        document.getElementById('sim-count').value = MIN_SIMS;
    } else if (simCount > MAX_SIMS) {
        simCount = MAX_SIMS;
        document.getElementById('sim-count').value = MAX_SIMS;
        alert(`Simulation count capped at ${MAX_SIMS.toLocaleString()} for performance.`);
    }
    
    // Validate inputs before running
    const attackerMelee = document.getElementById('attacker-melee').value;
    const attackerMissile = document.getElementById('attacker-missile').value;
    const defenderMelee = document.getElementById('defender-melee').value;
    const defenderDodge = document.getElementById('defender-dodge').value;
    
    if (mode === 'melee') {
        const attackerValid = validateDiceNotation(attackerMelee);
        const defenderValid = validateDiceNotation(defenderMelee);
        
        if (!attackerValid.valid) {
            alert('Invalid attacker melee notation: ' + attackerValid.error);
            return;
        }
        if (!defenderValid.valid) {
            alert('Invalid defender melee notation: ' + defenderValid.error);
            return;
        }
    } else {
        const attackerValid = validateDiceNotation(attackerMissile);
        const defenderValid = validateDiceNotation(defenderDodge);
        
        if (!attackerValid.valid) {
            alert('Invalid attacker missile notation: ' + attackerValid.error);
            return;
        }
        if (!defenderValid.valid) {
            alert('Invalid defender dodge notation: ' + defenderValid.error);
            return;
        }
    }
    
    const attackerNameInput = document.getElementById('attacker-name').value.trim();
    const defenderNameInput = document.getElementById('defender-name').value.trim();
    
    const attacker = {
        name: attackerNameInput || 'Attacker',
        figures: parseInt(document.getElementById('attacker-figures').value) || 1,
        melee: attackerMelee,
        missile: attackerMissile
    };
    
    const defender = {
        name: defenderNameInput || 'Defender',
        figures: parseInt(document.getElementById('defender-figures').value) || 1,
        melee: document.getElementById('defender-melee').value,
        dodge: document.getElementById('defender-dodge').value
    };
    
    const attackerBonusType = document.querySelector('input[name="attacker-bonus"]:checked').value;
    const defenderBonusType = document.querySelector('input[name="defender-bonus"]:checked').value;
    
    const attackerOpts = {
        bonusType: attackerBonusType,  // 'none', 'standard', 'double'
        isArtillery: document.getElementById('attacker-artillery').checked,
        isIndirectFire: document.getElementById('attacker-indirect').checked
    };
    
    const defenderOpts = {
        bonusType: defenderBonusType  // 'none', 'standard', 'double'
    };
    
    const combatFn = mode === 'melee' ? simulateMelee : simulateMissile;
    
    // Show loading spinner
    showLoading(true, `Running ${simCount.toLocaleString()} simulations...`);
    
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
        try {
            const results = runMonteCarlo(simCount, combatFn, attacker, defender, attackerOpts, defenderOpts);
            
            if (results.validSimulations === 0) {
                showLoading(false);
                alert('No valid simulations. Please check your dice notation inputs.');
                return;
            }
            
            // Determine which rolls were used
            const attackerRoll = mode === 'melee' ? attackerMelee : attackerMissile;
            const defenderRoll = mode === 'melee' ? defenderMelee : defenderDodge;
            
            // Render results (moved inside setTimeout)
            renderResults(results, mode, attackerOpts, attackerRoll, defenderRoll, attackerNameInput, defenderNameInput, attacker.figures, defender.figures);
            
        } catch (error) {
            console.error('Simulation error:', error);
            alert('An error occurred during simulation.');
        } finally {
            showLoading(false);
        }
    }, 50);
}

function renderResults(results, mode, attackerOpts, attackerRoll, defenderRoll, attackerName, defenderName, attackerFigures, defenderFigures) {
    const n = results.validSimulations;
    
    // Calculate percentages and averages for history
    const attackerPct = results.attackerWins / n * 100;
    const defenderPct = results.defenderWins / n * 100;
    const drawPct = results.draws / n * 100;
    const avgAttackerCasualties = results.attackerCasualties.reduce((a, b) => a + b, 0) / n;
    const avgDefenderCasualties = results.defenderCasualties.reduce((a, b) => a + b, 0) / n;
    
    // Add to history
    addToHistory(mode, attackerRoll, defenderRoll, attackerPct, defenderPct, drawPct, attackerOpts, attackerName, defenderName, attackerFigures, defenderFigures, avgAttackerCasualties, avgDefenderCasualties);
    
    // Show results section
    document.getElementById('results').classList.add('visible');
    
    // Render victory chart
    renderVictoryChart(results);
    
    // Calculate sigma stats
    const attackerSigma = calculateSigmaStats(results.attackerCasualties);
    
    // Render attacker histogram (casualties inflicted by attacker)
    renderHistogram('hist-attacker', results.attackerCasualties, 'attacker', attackerSigma);
    renderSigmaStats('attacker', attackerSigma, 'attacker');
    
    // Update summary stats
    
    document.getElementById('avg-cas-attacker').textContent = (results.attackerCasualties.reduce((a, b) => a + b, 0) / n).toFixed(2);
    document.getElementById('avg-cas-defender').textContent = (results.defenderCasualties.reduce((a, b) => a + b, 0) / n).toFixed(2);
    
    document.getElementById('avg-wins-attacker').textContent = (results.totalAttackerWins / n).toFixed(2);
    document.getElementById('avg-wins-defender').textContent = (results.totalDefenderWins / n).toFixed(2);
    
    document.getElementById('avg-dice-attacker').textContent = (results.totalAttackerDice / n).toFixed(1);
    document.getElementById('avg-dice-defender').textContent = (results.totalDefenderDice / n).toFixed(1);
    
    // Show/hide missile-specific rows and update labels
    const missileRows = ['missile-shots-row', 'missile-dodges-row', 'missile-ties-row'];
    const defenderHistTitle = document.getElementById('defender-hist-title');
    
    // Show/hide artillery and indirect indicators
    const artilleryIndicator = document.getElementById('artillery-indicator');
    const indirectIndicator = document.getElementById('indirect-indicator');
    
    if (mode === 'missile') {
        // Show missile-specific rows
        missileRows.forEach(id => document.getElementById(id).style.display = '');
        document.getElementById('avg-shots-attacker').textContent = (results.totalAttackerSuccessfulShots / n).toFixed(2);
        document.getElementById('avg-dodges-defender').textContent = (results.totalDefenderDodges / n).toFixed(2);
        document.getElementById('avg-ties').textContent = (results.totalTiedComparisons / n).toFixed(2);
        
        // Show artillery/indirect indicators if active
        artilleryIndicator.style.display = attackerOpts.isArtillery ? 'inline' : 'none';
        indirectIndicator.style.display = attackerOpts.isIndirectFire ? 'inline' : 'none';
        
        // Change defender histogram to show dodges instead of casualties
        defenderHistTitle.textContent = 'Successful Dodges by Defender';
        document.getElementById('defender-hist-explanation').textContent = 
            'Each bar shows how often that number of dodges occurred across all simulations';
        document.getElementById('defender-x-label').textContent = 'Number of Dodges';
        
        const defenderSigma = calculateSigmaStats(results.defenderDodgesDistribution);
        renderHistogram('hist-defender', results.defenderDodgesDistribution, 'defender', defenderSigma);
        renderSigmaStats('defender', defenderSigma, 'defender');
    } else {
        // Hide artillery/indirect indicators in melee
        artilleryIndicator.style.display = 'none';
        indirectIndicator.style.display = 'none';
        // Hide missile-specific rows
        missileRows.forEach(id => document.getElementById(id).style.display = 'none');
        defenderHistTitle.textContent = 'Casualties Inflicted by Defender';
        document.getElementById('defender-hist-explanation').textContent = 
            'Each bar shows how often that number of casualties occurred across all simulations';
        document.getElementById('defender-x-label').textContent = 'Number of Casualties';
        
        const defenderSigma = calculateSigmaStats(results.defenderCasualties);
        renderHistogram('hist-defender', results.defenderCasualties, 'defender', defenderSigma);
        renderSigmaStats('defender', defenderSigma, 'defender');
    }
    
    // Dice statistics
    document.getElementById('stat-attacker-base').textContent = (results.totalAttackerDice / n).toFixed(1);
    document.getElementById('stat-attacker-bonus').textContent = (results.totalAttackerBonusRolled / n).toFixed(1);
    document.getElementById('stat-attacker-subs').textContent = (results.totalAttackerSubs / n).toFixed(2);
    document.getElementById('stat-attacker-high').textContent = (results.totalAttackerHighest / n).toFixed(2);
    document.getElementById('stat-attacker-avg').textContent = (results.totalAttackerAvg / n).toFixed(2);
    
    document.getElementById('stat-defender-base').textContent = (results.totalDefenderDice / n).toFixed(1);
    document.getElementById('stat-defender-bonus').textContent = (results.totalDefenderBonusRolled / n).toFixed(1);
    document.getElementById('stat-defender-subs').textContent = (results.totalDefenderSubs / n).toFixed(2);
    document.getElementById('stat-defender-high').textContent = (results.totalDefenderHighest / n).toFixed(2);
    document.getElementById('stat-defender-avg').textContent = (results.totalDefenderAvg / n).toFixed(2);
    
    // Scroll to results
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// SIMULATION HISTORY
// ============================================

const simulationHistory = [];

function addToHistory(mode, attackerRoll, defenderRoll, attackerPct, defenderPct, drawPct, attackerOpts, attackerName, defenderName, attackerFigures, defenderFigures, avgAttackerCasualties, avgDefenderCasualties) {
    const entry = {
        id: Date.now(),
        mode,
        attackerRoll,
        defenderRoll,
        attackerName: attackerName || '',
        defenderName: defenderName || '',
        attackerFigures,
        defenderFigures,
        avgAttackerCasualties: avgAttackerCasualties.toFixed(2),
        avgDefenderCasualties: avgDefenderCasualties.toFixed(2),
        attackerPct: attackerPct.toFixed(1),
        defenderPct: defenderPct.toFixed(1),
        drawPct: drawPct.toFixed(1),
        artillery: attackerOpts.isArtillery || false,
        indirect: attackerOpts.isIndirectFire || false,
        attackerBonus: attackerOpts.bonusType,
        timestamp: new Date().toLocaleTimeString()
    };
    
    simulationHistory.unshift(entry);  // Add to beginning
    
    // Keep only last 20 entries
    if (simulationHistory.length > 20) {
        simulationHistory.pop();
    }
    
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('history-list');
    const countBadge = document.getElementById('history-count');
    
    // Guard for tests.html where DOM elements don't exist
    if (!container || !countBadge) return;
    
    // Update count badge
    if (simulationHistory.length > 0) {
        countBadge.textContent = simulationHistory.length;
        countBadge.style.display = 'inline';
    } else {
        countBadge.style.display = 'none';
    }
    
    if (simulationHistory.length === 0) {
        container.innerHTML = '<div class="history-empty">No simulations yet. Run a simulation to see results here.</div>';
        return;
    }
    
    container.innerHTML = simulationHistory.map((entry, index) => {
        const modifiers = [];
        if (entry.artillery) modifiers.push('Artillery');
        if (entry.indirect) modifiers.push('Indirect');
        if (entry.attackerBonus !== 'none') modifiers.push(entry.attackerBonus === 'double' ? '100% Bonus' : '50% Bonus');
        
        const modifierText = modifiers.length > 0 ? ` [${modifiers.join(', ')}]` : '';
        const isNew = index === 0 ? ' new' : '';
        
        // Build unit display with names and figures
        const attackerLabel = entry.attackerName || 'Attacker';
        const defenderLabel = entry.defenderName || 'Defender';
        
        return `
            <div class="history-item${isNew}">
                <div class="history-type ${entry.mode}">${entry.mode}${modifierText}</div>
                <div class="history-units">
                    <div class="history-unit attacker">
                        <span class="unit-name">${attackerLabel}</span>
                        <span class="unit-stats">${entry.attackerFigures} fig · ${entry.attackerRoll}</span>
                        <span class="unit-casualties">~${entry.avgAttackerCasualties} cas</span>
                    </div>
                    <span class="history-vs">vs</span>
                    <div class="history-unit defender">
                        <span class="unit-name">${defenderLabel}</span>
                        <span class="unit-stats">${entry.defenderFigures} fig · ${entry.defenderRoll}</span>
                        <span class="unit-casualties">~${entry.avgDefenderCasualties} cas</span>
                    </div>
                </div>
                <div class="history-results">
                    <span class="win-pct attacker-pct">${entry.attackerPct}%</span>
                    <span class="win-pct draw-pct">${entry.drawPct}%</span>
                    <span class="win-pct defender-pct">${entry.defenderPct}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function clearHistory() {
    simulationHistory.length = 0;
    renderHistory();
}

// ============================================
// DICE NOTATION VALIDATION
// ============================================

function validateDiceNotation(str) {
    if (!str || str.trim() === '') {
        return { valid: false, error: 'Empty input', parsed: null };
    }
    
    const cleaned = str.toLowerCase().replace(/\s/g, '');
    const parts = cleaned.split('+');
    const errors = [];
    let hasValidPart = false;
    const diceTypes = [];
    
    for (const part of parts) {
        if (part.trim() === '') continue;
        
        // Check for per-figure notation: NdF/Mf
        const perFigureMatch = part.match(/^(\d+)d(\d+)\/(\d+)f$/);
        // Check for flat notation: NdF
        const flatMatch = part.match(/^(\d+)d(\d+)$/);
        
        if (perFigureMatch) {
            const count = parseInt(perFigureMatch[1]);
            const faces = parseInt(perFigureMatch[2]);
            const perFig = parseInt(perFigureMatch[3]);
            
            if (count < 1) errors.push(`Invalid dice count: ${count}`);
            if (faces < 2) errors.push(`Invalid die faces: d${faces}`);
            if (perFig < 1) errors.push(`Invalid figures: ${perFig}f`);
            if (![4, 6, 8, 10, 12, 20].includes(faces)) {
                errors.push(`Unusual die type: d${faces}`);
            }
            
            diceTypes.push(faces);
            hasValidPart = true;
        } else if (flatMatch) {
            const count = parseInt(flatMatch[1]);
            const faces = parseInt(flatMatch[2]);
            
            if (count < 1) errors.push(`Invalid dice count: ${count}`);
            if (faces < 2) errors.push(`Invalid die faces: d${faces}`);
            
            diceTypes.push(faces);
            hasValidPart = true;
        } else {
            errors.push(`Invalid format: "${part}"`);
        }
    }
    
    if (!hasValidPart) {
        return { valid: false, error: 'No valid dice notation found', parsed: null, diceTypes: [] };
    }
    
    if (errors.length > 0) {
        return { valid: false, error: errors.join('; '), parsed: null, diceTypes };
    }
    
    return { valid: true, error: null, parsed: parseDiceNotation(str), diceTypes };
}

function validateDiceInput(inputElement) {
    const value = inputElement.value;
    const validationId = inputElement.id + '-validation';
    const validationEl = document.getElementById(validationId);
    
    if (!validationEl) return;
    
    if (!value || value.trim() === '') {
        inputElement.classList.remove('valid', 'invalid');
        validationEl.textContent = '';
        validationEl.className = 'validation-message';
        return;
    }
    
    const result = validateDiceNotation(value);
    
    if (result.valid) {
        inputElement.classList.remove('invalid');
        inputElement.classList.add('valid');
        validationEl.textContent = '✓ Valid: ' + describeDicePool(result.parsed);
        validationEl.className = 'validation-message success';
    } else {
        inputElement.classList.remove('valid');
        inputElement.classList.add('invalid');
        validationEl.textContent = '✗ ' + result.error;
        validationEl.className = 'validation-message error';
    }
}

function describeDicePool(parsed) {
    if (!parsed) return '';
    const parts = [];
    
    for (const spec of parsed.perFigure) {
        parts.push(`${spec.count}d${spec.faces} per ${spec.perFigures} fig`);
    }
    for (const spec of parsed.flat) {
        parts.push(`${spec.count}d${spec.faces} flat`);
    }
    
    return parts.join(' + ');
}

// ============================================
// INDIRECT FIRE ELIGIBILITY
// ============================================

function checkIndirectFireEligibility() {
    const missileInput = document.getElementById('attacker-missile').value;
    const indirectCheckbox = document.getElementById('attacker-indirect');
    const warningEl = document.getElementById('indirect-warning');
    
    if (!missileInput || missileInput.trim() === '') {
        warningEl.style.display = 'none';
        return;
    }
    
    const result = validateDiceNotation(missileInput);
    
    if (result.valid && result.diceTypes) {
        const hasD8 = result.diceTypes.includes(8);
        const onlyD6 = result.diceTypes.every(d => d === 6);
        
        if (onlyD6) {
            warningEl.textContent = '⚠ Only d6 in pool - indirect fire not allowed';
            warningEl.style.display = 'block';
            indirectCheckbox.disabled = true;
            indirectCheckbox.checked = false;
        } else if (!hasD8) {
            warningEl.textContent = '⚠ No d8 in pool - indirect fire has no effect';
            warningEl.style.display = 'block';
            indirectCheckbox.disabled = false;
        } else {
            warningEl.style.display = 'none';
            indirectCheckbox.disabled = false;
        }
    } else {
        warningEl.style.display = 'none';
    }
}

// ============================================
// COMBAT MODE TOGGLE - Show/Hide Fields
// ============================================

function updateCombatModeFields() {
    const modeInput = document.querySelector('input[name="combat-mode"]:checked');
    if (!modeInput) return; // Guard for tests.html
    
    const mode = modeInput.value;
    const meleeFields = document.querySelectorAll('.melee-field');
    const missileFields = document.querySelectorAll('.missile-field');
    
    if (mode === 'melee') {
        meleeFields.forEach(el => el.style.display = '');
        missileFields.forEach(el => el.style.display = 'none');
    } else {
        meleeFields.forEach(el => el.style.display = 'none');
        missileFields.forEach(el => el.style.display = '');
        checkIndirectFireEligibility();
    }
}

// Add event listeners for combat mode radio buttons
document.querySelectorAll('input[name="combat-mode"]').forEach(radio => {
    radio.addEventListener('change', updateCombatModeFields);
});

// Initialize on page load
updateCombatModeFields();

// ============================================
// RULES MODAL
// ============================================

let rulesLoaded = false;

function toggleRulesModal() {
    const modal = document.getElementById('rules-modal');
    if (modal.classList.contains('visible')) {
        modal.classList.remove('visible');
        document.body.style.overflow = '';
    } else {
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
        
        // Load rules on first open
        if (!rulesLoaded) {
            loadRules();
        }
    }
}

function loadRules() {
    const rulesText = document.getElementById('rules-text');
    
    fetch('game-rules.md')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load rules');
            return response.text();
        })
        .then(text => {
            rulesText.textContent = text;
            rulesLoaded = true;
        })
        .catch(error => {
            rulesText.textContent = 'Rules cannot be loaded when viewing this page as a local file.\n\nPlease access the page via a web server or view it on GitHub Pages.';
            console.error('Error loading rules:', error);
        });
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('rules-modal');
        if (modal && modal.classList.contains('visible')) {
            toggleRulesModal();
        }
    }
});

// Close modal when clicking outside content
document.addEventListener('click', function(e) {
    const modal = document.getElementById('rules-modal');
    if (e.target === modal) {
        toggleRulesModal();
    }
});
