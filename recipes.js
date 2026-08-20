const getRecipe = (cabinetName) => {
    // Zamieniamy nazwę na wielkie litery, by uniknąć literówek
    const name = cabinetName.toUpperCase(); 
    let elements = [];

    // --- 1. LAURA ---
    if (name.includes('LAURA')) {
        // Sprawdzamy czy szafka jest wysoka (W), by dobrać wymiar boku
        const isHigh = name.includes('W45') || name.includes('W60') || name.includes('W80') || name.includes('W90') || name.includes('W120');
        const sideDim = isHigh ? '390x230' : '300x230';
        const divDim = isHigh ? '353x210' : '263x210';

        elements = [
            // Elementy z magazynu lub do cięcia
            { name: 'Bok lewy', dimension: sideDim, type: 'bok' },
            { name: 'Bok prawy', dimension: sideDim, type: 'bok' },
            { name: 'Przegroda', dimension: divDim, type: 'przegroda' },
            // Elementy zawsze robione od zera (chyba że dodasz im wymiar i wprowadzisz do magazynu)
            { name: 'Wieniec górny', dimension: 'zmienny', type: 'wieniec' },
            { name: 'Wieniec dolny', dimension: 'zmienny', type: 'wieniec' },
            { name: 'Front', dimension: 'zmienny', type: 'front' },
            { name: 'Półka', dimension: 'zmienny', type: 'polka' },
            { name: 'Plecy', dimension: 'zmienny', type: 'plecy' },
            // Elementy montażowe (omijają maszyny)
            { name: 'Akcesoria', dimension: 'brak', type: 'akcesoria', isHardware: true },
            { name: 'Siłowniki', dimension: 'brak', type: 'akcesoria', isHardware: true }
        ];
    }
    // --- 2. LUNA ---
    else if (name.includes('LUNA')) {
        elements = [
            { name: 'Bok lewy pralki', dimension: 'zmienny', type: 'bok' },
            { name: 'Bok prawy pralki', dimension: 'zmienny', type: 'bok' },
            { name: 'Półka pralki', dimension: 'zmienny', type: 'polka' },
            { name: 'Daszek pralki', dimension: 'zmienny', type: 'daszek' },
            { name: 'Plecy pralki', dimension: 'zmienny', type: 'plecy' },
            { name: 'Front pralki', dimension: 'zmienny', type: 'front' },
            { name: 'Bok suszarki (lewy)', dimension: 'zmienny', type: 'bok' },
            { name: 'Bok suszarki (prawy)', dimension: 'zmienny', type: 'bok' },
            { name: 'Daszek suszarki', dimension: 'zmienny', type: 'daszek' },
            { name: 'Akcesoria', dimension: 'brak', type: 'akcesoria', isHardware: true },
            { name: 'Szyny', dimension: 'brak', type: 'akcesoria', isHardware: true }
        ];
    }
    // --- 3. PAULA ---
    else if (name.includes('PAULA')) {
        elements = [
            { name: 'Bok lewy', dimension: '390x230', type: 'bok' },
            { name: 'Bok prawy', dimension: '390x230', type: 'bok' },
            { name: 'Przegroda', dimension: '353x210', type: 'przegroda' },
            { name: 'Wieniec górny', dimension: 'zmienny', type: 'wieniec' },
            { name: 'Wieniec dolny', dimension: 'zmienny', type: 'wieniec' },
            { name: 'Półka', dimension: 'zmienny', type: 'polka' },
            { name: 'Front', dimension: 'zmienny', type: 'front' },
            { name: 'Plecy', dimension: 'zmienny', type: 'plecy' },
            { name: 'Deska na wieszaki', dimension: 'zmienny', type: 'deska' },
            { name: 'Akcesoria', dimension: 'brak', type: 'akcesoria', isHardware: true },
            { name: 'Wieszaki', dimension: 'brak', type: 'akcesoria', isHardware: true },
            { name: 'Siłowniki', dimension: 'brak', type: 'akcesoria', isHardware: true }
        ];
    }
    // --- 4. RTV ---
    else if (name.includes('RTV')) {
        // Logika ilości przegród
        const numDivs = name.includes('100') ? 1 : 2;
        
        elements = [
            { name: 'Bok lewy', dimension: '300x282', type: 'bok' },
            { name: 'Bok prawy', dimension: '300x282', type: 'bok' },
            { name: 'Wieniec górny', dimension: 'zmienny', type: 'wieniec' },
            { name: 'Wieniec dolny', dimension: 'zmienny', type: 'wieniec' },
            { name: 'Front', dimension: 'zmienny', type: 'front' },
            { name: 'Plecy', dimension: 'zmienny', type: 'plecy' },
            { name: 'Akcesoria', dimension: 'brak', type: 'akcesoria', isHardware: true },
            { name: 'Siłowniki', dimension: 'brak', type: 'akcesoria', isHardware: true },
            { name: 'Stópki', dimension: 'brak', type: 'akcesoria', isHardware: true }
        ];
        
        for(let i=0; i<numDivs; i++) {
            elements.push({ name: `Przegroda ${i+1}`, dimension: '264x284', type: 'przegroda' });
        }
    }

    return elements;
};

// Eksportujemy funkcję, aby główny serwer mógł z niej korzystać
module.exports = { getRecipe };