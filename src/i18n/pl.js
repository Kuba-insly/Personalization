// Polish translations for IDD form keys.
// Keys come from title_translation_key and enum_translation_keys in the JSON schema.
// When a key is not found here, the component falls back to the raw `title` or `value` from JSON.
const pl = {
  // ── Refusal ──────────────────────────────────────────────────────────
  'idd.refusal': 'Klient zdecydowanie nie zgadza się na przeprowadzenie badania potrzeb',

  // ── Car / Pojazd ─────────────────────────────────────────────────────
  'idd.car':                  'Pojazd',
  'idd.car.mtpl':             'OC/ZK',
  'idd.car.casco':            'AC',
  'idd.car.assistance':       'Assistance',
  'idd.car.accident':         'NNW',
  'idd.car.legalProtection':  'Ochrona prawna',
  'idd.car.tires':            'Opony',
  'idd.car.glass':            'Szyby',
  'idd.car.gap':              'GAP',
  'idd.car.other':            'Inne',
  'idd.car.car_comment':      'Inne (opisz)',

  // ── Property / Mieszkanie ─────────────────────────────────────────────
  'idd.property':             'Mieszkanie/Dom',
  'idd.property.fire':        'Ogień',
  'idd.property.bulgary':     'Kradzież',
  'idd.property.glass':       'Szyby',        // allRisk maps to this key in default schema
  'idd.property.tpl':         'OC w życiu prywatnym',
  'idd.property.other':       'Inne',
  'idd.car.property_comment': 'Inne (opisz)',

  // ── Travel / Podróże ──────────────────────────────────────────────────
  'idd.travel':                   'Podróże',
  'idd.travel.europe':            'Europa',
  'idd.travel.world':             'Świat',
  'idd.travel.work':              'Praca',
  'idd.travel.travel':            'Turystyka',
  'idd.travel.sport':             'Sport',
  'idd.travel.medicalExpenses':   'Koszty leczenia',
  'idd.travel.tpl':               'OC',
  'idd.travel.accident':          'NNW',
  'idd.travel.assistance':        'Assistance',
  'idd.travel.luggage':           'Bagaż',
  'idd.travel.other':             'Inne',
  'idd.car.travel_comment':       'Inne (opisz)',

  // ── Life / Życie ──────────────────────────────────────────────────────
  'idd.life':                 'Życie',
  'idd.life.healthProtect':   'Ochrona',
  'idd.life.health':          'Zdrowie',
  'idd.life.savings':         'Oszczędności',
  'idd.life.individual':      'Indywidualne',
  'idd.life.family':          'Rodzina',
  'idd. life.group':          'Grupowe',      // note: space in key is a typo in source schema
  'idd.life.group':           'Grupowe',
  'idd.life.other':           'Inne',
  'idd.car.life_comment':     'Inne (opisz)',

  // ── Agricultural / Rolne ──────────────────────────────────────────────
  'idd.agricultural':               'Rolne',
  'idd.agricultural.tpl':           'OC',
  'idd.agricultural.buildings':     'Budynki',
  'idd.agricultural.property':      'Mienie',
  'idd.agricultural.crops':         'Uprawy',
  'idd.agricultural.other':         'Inne',
  'idd.car.agricultural_comment':   'Inne (opisz)',

  // ── Company / Firma ───────────────────────────────────────────────────
  'idd.company':              'Firma',
  'idd.company.fire':         'Ogień',
  'idd.company.theft':        'Kradzież',
  'idd.company.allrisk':      'All Risk',
  'idd.company.tpl':          'OC',
  'idd.company.finance':      'Finanse',
  'idd.company.electronics':  'Elektronika',
  'iddd.company.other':       'Inne',         // note: 3×d typo in source schema
  'idd.company.other':        'Inne',
  'idd.car.company_comment':  'Inne (opisz)',

  // ── Others / Inne ─────────────────────────────────────────────────────
  'idd.others':         'Inne',
  'idd.others_comment': 'Inne produkty nieujęte w powyższych kategoriach',

  // ── In the future / W przyszłości ─────────────────────────────────────
  'idd.inthefuture':              'W przyszłości',
  'idd.inthefuture.car':          'Pojazd',
  'idd.inthefuture.property':     'Mieszkanie/Dom',
  'idd.inthefuture.travel':       'Podróże',
  'idd.inthefuture.life':         'Życie/Zdrowie',
  'idd.inthefuture.agricultural': 'Rolne',
  'idd.inthefuture.company':      'Firma',
  'idd.inthefuture.other':        'Inne',
  'idd.car.inthefuture_comment':  'Inne (opisz)',

  // ── Agreement for email ───────────────────────────────────────────────
  'idd.agreementforemail':       'Klient wyraża zgodę na wysłanie wszelkich informacji wymaganych prawem, takich jak: OWU, Karta Produktu i informacja o Agencie oraz prawie do odstąpienia od umowy i złożenia reklamacji na adres e-mail.',
  'idd.agreementforemail.yes':   'Tak',

  // ── Closing textareas ─────────────────────────────────────────────────
  'idd.otherIddRequirenment_comment':     'Dodatkowe wymagania klienta dotyczące cech produktów',
  'idd.nonAcceptableExclusions_comment':  'Nieakceptowalne wyłączenia zakresu odpowiedzialności',
  'idd.searchingEsgProduct_comment':      'Istotne dla klienta następujące czynniki ESG',

  // ── Comment ───────────────────────────────────────────────────────────
  'idd.comment': 'Dodatkowe uwagi (niewidoczne dla klienta)',
}

export default pl
