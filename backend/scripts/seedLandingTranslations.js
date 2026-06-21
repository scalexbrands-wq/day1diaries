// One-off seed: fills in translations (hi/ta/te/ml/kn) for the default
// landing_hero content and the 7 standard landing_categories rows, so
// switching language on "/" shows translated copy out of the box instead
// of silently falling back to English everywhere. Matches by the known
// English category name — admin-renamed/custom categories are untouched.
//
// Safe to re-run — always overwrites with the same fixed translations
// (idempotent), never touches unrelated fields.
//
// Usage (production): run as a one-off ECS task overriding the command,
// same as the other scripts/ files in this directory.

require('dotenv').config()
const { pool } = require('../src/db/pool')

const HERO_TRANSLATIONS = {
  hi: {
    eyebrow: 'हर फ्रेशर के लिए, हर जगह',
    headline: 'आपका पहला दिन ऑफिस में एक ऐसी कहानी है जो केवल आपने जी है।',
    headline_highlight: 'केवल आपने',
    subheadline: 'अब पूरी दुनिया इसे पढ़ सकती है। डे1 डायरीज़ वह समुदाय है जहां फ्रेशर्स सच्ची कहानियां साझा करते हैं, जीवन बदलने वाली आदतें अपनाते हैं, और साथ में आगे बढ़ते हैं।',
    cta_primary_text: 'मेरा डे 1 शेयर करें ✍️',
    cta_secondary_text: 'देखें यह कैसे काम करता है →',
  },
  ta: {
    eyebrow: 'ஒவ்வொரு ஃப்ரெஷருக்கும், எல்லா இடங்களிலும்',
    headline: 'வேலையில் உங்கள் முதல் நாள் நீங்கள் மட்டும் வாழ்ந்த ஒரு கதை.',
    headline_highlight: 'நீங்கள் மட்டும்',
    subheadline: 'இப்போது உலகம் அதைப் படிக்க முடியும். டே1 டயரீஸ் என்பது ஃப்ரெஷர்கள் உண்மையான கதைகளைப் பகிர்ந்து, வாழ்க்கையை மாற்றும் பழக்கங்களை ஏற்று, ஒன்றாக வளரும் சமூகம்.',
    cta_primary_text: 'என் டே 1-ஐ பகிரு ✍️',
    cta_secondary_text: 'இது எப்படி வேலை செய்கிறது என்று காண்க →',
  },
  te: {
    eyebrow: 'ప్రతి ఫ్రెషర్ కోసం, ప్రతిచోటా',
    headline: 'ఉద్యోగంలో మీ మొదటి రోజు మీరు మాత్రమే జీవించిన కథ.',
    headline_highlight: 'మీరు మాత్రమే',
    subheadline: 'ఇప్పుడు ప్రపంచం దానిని చదవగలదు. డే1 డైరీస్ అనేది ఫ్రెషర్లు నిజమైన కథలను పంచుకుని, జీవితాన్ని మార్చే అలవాట్లను అలవర్చుకుని, కలిసి ఎదిగే సంఘం.',
    cta_primary_text: 'నా డే 1 షేర్ చేయండి ✍️',
    cta_secondary_text: 'ఇది ఎలా పనిచేస్తుందో చూడండి →',
  },
  ml: {
    eyebrow: 'എല്ലാ ഫ്രെഷറിനും, എല്ലായിടത്തും',
    headline: 'ജോലിയിലെ നിങ്ങളുടെ ആദ്യ ദിനം നിങ്ങൾ മാത്രം ജീവിച്ച ഒരു കഥയാണ്.',
    headline_highlight: 'നിങ്ങൾ മാത്രം',
    subheadline: 'ഇപ്പോൾ ലോകത്തിന് അത് വായിക്കാം. ഡേ1 ഡയറീസ് എന്നത് ഫ്രെഷർമാർ യഥാർത്ഥ കഥകൾ പങ്കിടുകയും ജീവിതം മാറ്റുന്ന ശീലങ്ങൾ സ്വീകരിക്കുകയും ഒരുമിച്ച് വളരുകയും ചെയ്യുന്ന കമ്മ്യൂണിറ്റിയാണ്.',
    cta_primary_text: 'എന്റെ ഡേ 1 ഷെയർ ചെയ്യുക ✍️',
    cta_secondary_text: 'ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു എന്ന് കാണുക →',
  },
  kn: {
    eyebrow: 'ಪ್ರತಿ ಫ್ರೆಷರ್‌ಗಾಗಿ, ಎಲ್ಲೆಡೆ',
    headline: 'ಉದ್ಯೋಗದಲ್ಲಿ ನಿಮ್ಮ ಮೊದಲ ದಿನ ನೀವು ಮಾತ್ರ ಬದುಕಿದ ಕಥೆ.',
    headline_highlight: 'ನೀವು ಮಾತ್ರ',
    subheadline: 'ಈಗ ಜಗತ್ತು ಅದನ್ನು ಓದಬಹುದು. ಡೇ1 ಡೈರೀಸ್ ಎಂದರೆ ಫ್ರೆಷರ್‌ಗಳು ನಿಜವಾದ ಕಥೆಗಳನ್ನು ಹಂಚಿಕೊಂಡು, ಜೀವನವನ್ನು ಬದಲಾಯಿಸುವ ಅಭ್ಯಾಸಗಳನ್ನು ಅಳವಡಿಸಿಕೊಂಡು, ಒಟ್ಟಿಗೆ ಬೆಳೆಯುವ ಸಮುದಾಯ.',
    cta_primary_text: 'ನನ್ನ ಡೇ 1 ಹಂಚಿಕೊಳ್ಳಿ ✍️',
    cta_secondary_text: 'ಇದು ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ ಎಂದು ನೋಡಿ →',
  },
}

const CATEGORY_TRANSLATIONS = {
  'First Day at Job':          { hi: { name: 'नौकरी का पहला दिन' },        ta: { name: 'வேலையில் முதல் நாள்' },         te: { name: 'ఉద్యోగంలో మొదటి రోజు' },        ml: { name: 'ജോലിയിലെ ആദ്യ ദിനം' },          kn: { name: 'ಉದ್ಯೋಗದ ಮೊದಲ ದಿನ' } },
  'First Startup Experience':  { hi: { name: 'पहला स्टार्टअप अनुभव' },     ta: { name: 'முதல் ஸ்டார்ட்அப் அனுபவம்' },   te: { name: 'మొదటి స్టార్టప్ అనుభవం' },      ml: { name: 'ആദ്യ സ്റ്റാർട്ടപ്പ് അനുഭവം' },   kn: { name: 'ಮೊದಲ ಸ್ಟಾರ್ಟಪ್ ಅನುಭವ' } },
  'First Business Client':     { hi: { name: 'पहला बिज़नेस क्लाइंट' },     ta: { name: 'முதல் வணிக வாடிக்கையாளர்' },    te: { name: 'మొదటి బిజినెస్ క్లయింట్' },     ml: { name: 'ആദ്യ ബിസിനസ് ക്ലയന്റ്' },        kn: { name: 'ಮೊದಲ ಬಿಸಿನೆಸ್ ಕ್ಲೈಂಟ್' } },
  'First College Day':         { hi: { name: 'कॉलेज का पहला दिन' },        ta: { name: 'கல்லூரியில் முதல் நாள்' },      te: { name: 'కాలేజీలో మొదటి రోజు' },         ml: { name: 'കോളേജിലെ ആദ്യ ദിനം' },          kn: { name: 'ಕಾಲೇಜಿನ ಮೊದಲ ದಿನ' } },
  'First Failure':             { hi: { name: 'पहली असफलता' },              ta: { name: 'முதல் தோல்வி' },                te: { name: 'మొదటి వైఫల్యం' },               ml: { name: 'ആദ്യ പരാജയം' },                 kn: { name: 'ಮೊದಲ ವೈಫಲ್ಯ' } },
  'First Success':             { hi: { name: 'पहली सफलता' },               ta: { name: 'முதல் வெற்றி' },                 te: { name: 'మొదటి విజయం' },                ml: { name: 'ആദ്യ വിജയം' },                  kn: { name: 'ಮೊದಲ ಯಶಸ್ಸು' } },
  'Habit Transformation':      { hi: { name: 'आदत परिवर्तन' },             ta: { name: 'பழக்க மாற்றம்' },                te: { name: 'అలవాటు మార్పు' },               ml: { name: 'ശീല പരിവർത്തനം' },              kn: { name: 'ಅಭ್ಯಾಸ ಪರಿವರ್ತನೆ' } },
}

async function main() {
  await pool.query(
    `UPDATE landing_hero SET translations = $1::jsonb WHERE id = 1`,
    [JSON.stringify(HERO_TRANSLATIONS)]
  )
  console.log('+ landing_hero translations set')

  const { rows: categories } = await pool.query('SELECT id, name FROM landing_categories')
  let updated = 0
  for (const cat of categories) {
    const translations = CATEGORY_TRANSLATIONS[cat.name]
    if (!translations) continue
    await pool.query('UPDATE landing_categories SET translations = $1::jsonb WHERE id = $2', [JSON.stringify(translations), cat.id])
    updated++
    console.log(`  + "${cat.name}" translated`)
  }

  console.log(`\nDone: hero translated, ${updated}/${categories.length} categories translated.`)
  process.exit(0)
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1) })
