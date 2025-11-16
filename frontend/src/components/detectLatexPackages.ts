/**
 * Detects all LaTeX packages used in a document by scanning for \usepackage commands.
 * Returns an array of package names (no duplicates).
 */
export function detectLatexPackages(latex: string): string[] {
  const regex = /\\usepackage(?:\[[^\]]*\])?\{([^}]*)\}/g;
  const found = new Set<string>();
  let match;
  while ((match = regex.exec(latex)) !== null) {
    // Packages can be comma-separated
    const pkgs = match[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const pkg of pkgs) found.add(pkg);
  }
  return Array.from(found);
}
