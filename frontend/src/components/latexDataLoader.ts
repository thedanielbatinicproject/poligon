// Utility for loading all LaTeX autocomplete data files as JSON
// Will be expanded with async loading and merging logic


export async function loadLatexAutocompleteData() {
  // List of all relevant data files (expand as needed)
  const files = [
    'commands.json',
    'environments.json',
    'macros.json',
    'latex-snippet.json',
    'unimathsymbols.json',
    'packagenames.json',
    'classnames.json',
    'bibtex-entries.json',
    'bibtex-optional-entries.json',
    'biblatex-entries.json',
    'biblatex-optional-entries.json',
    // ...add more as needed
  ];
  const basePath = '/assets/latex-autocomplete-data/';
  const data: Record<string, any> = {};
  for (const file of files) {
    try {
      const res = await fetch(basePath + file);
      if (!res.ok) throw new Error('Not found');
      data[file.replace('.json', '')] = await res.json();
    } catch (e) {
      // File may not exist or fail to load
      data[file.replace('.json', '')] = null;
    }
  }
  // Note: package files are loaded separately in latexCompletionsUnified.ts
  return data;
}
