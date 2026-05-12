const fs = require('fs');
const path = require('path');

function createSimpleBinary() {
    const size = 64;
    const binary = new Uint8Array(size * size);
    
    const cx = size / 2;
    const cy = size / 2;
    const w = 10;
    const h = 20;
    
    for (let y = cy - h; y < cy + h; y++) {
        for (let x = cx - w; x < cx + w; x++) {
            if (x >= 0 && x < size && y >= 0 && y < size) {
                binary[y * size + x] = 1;
            }
        }
    }
    
    return { binary, size };
}

function calculateHuMoments(binary, size) {
    let m00 = 0, m10 = 0, m01 = 0;
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const val = binary[y * size + x];
            m00 += val;
            m10 += x * val;
            m01 += y * val;
        }
    }
    
    if (m00 === 0) {
        return [0, 0, 0, 0, 0, 0, 0];
    }
    
    const xBar = m10 / m00;
    const yBar = m01 / m00;
    
    let mu20 = 0, mu02 = 0, mu11 = 0;
    let mu30 = 0, mu03 = 0, mu21 = 0, mu12 = 0;
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const val = binary[y * size + x];
            const dx = x - xBar;
            const dy = y - yBar;
            
            mu20 += dx * dx * val;
            mu02 += dy * dy * val;
            mu11 += dx * dy * val;
            mu30 += dx * dx * dx * val;
            mu03 += dy * dy * dy * val;
            mu21 += dx * dx * dy * val;
            mu12 += dx * dy * dy * val;
        }
    }
    
    console.log('Spatial Moments:');
    console.log(`  m00: ${m00}`);
    console.log(`  m10: ${m10}, m01: ${m01}`);
    console.log(`  xBar: ${xBar}, yBar: ${yBar}`);
    
    console.log('\nCentral Moments:');
    console.log(`  mu20: ${mu20}, mu02: ${mu02}, mu11: ${mu11}`);
    console.log(`  mu30: ${mu30}, mu03: ${mu03}, mu21: ${mu21}, mu12: ${mu12}`);
    
    const m00Sq = m00 * m00;
    const nu20 = mu20 / m00Sq;
    const nu02 = mu02 / m00Sq;
    const nu11 = mu11 / m00Sq;
    
    const m0025 = m00 * Math.sqrt(m00) * m00;
    console.log(`\nNormalization constants:`);
    console.log(`  m00^2: ${m00Sq}`);
    console.log(`  sqrt(m00): ${Math.sqrt(m00)}`);
    console.log(`  m00^2.5 (current): ${m0025}`);
    console.log(`  m00^2 * sqrt(m00): ${m00Sq * Math.sqrt(m00)}`);
    console.log(`  Correct m00^2.5: ${Math.pow(m00, 2.5)}`);
    
    const correct_m0025 = Math.pow(m00, 2.5);
    const nu30 = mu30 / correct_m0025;
    const nu03 = mu03 / correct_m0025;
    const nu21 = mu21 / correct_m0025;
    const nu12 = mu12 / correct_m0025;
    
    console.log('\nNormalized Central Moments:');
    console.log(`  nu20: ${nu20}, nu02: ${nu02}, nu11: ${nu11}`);
    console.log(`  nu30: ${nu30}, nu03: ${nu03}, nu21: ${nu21}, nu12: ${nu12}`);
    
    const hu = [];
    hu[0] = nu20 + nu02;
    hu[1] = (nu20 - nu02) * (nu20 - nu02) + 4 * nu11 * nu11;
    hu[2] = (nu30 - 3 * nu12) * (nu30 - 3 * nu12) + (3 * nu21 - nu03) * (3 * nu21 - nu03);
    hu[3] = (nu30 + nu12) * (nu30 + nu12) + (nu21 + nu03) * (nu21 + nu03);
    hu[4] = (nu30 - 3 * nu12) * (nu30 + nu12) * 
            ((nu30 + nu12) * (nu30 + nu12) - 3 * (nu21 + nu03) * (nu21 + nu03)) +
            (3 * nu21 - nu03) * (nu21 + nu03) *
            (3 * (nu30 + nu12) * (nu30 + nu12) - (nu21 + nu03) * (nu21 + nu03));
    hu[5] = (nu20 - nu02) * ((nu30 + nu12) * (nu30 + nu12) - (nu21 + nu03) * (nu21 + nu03)) +
            4 * nu11 * (nu30 + nu12