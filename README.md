# DOI EX — Bibliography DOI Extractor 📚🔗

**DOI EX** is a premium, lightweight, and fully self-contained desktop application designed for researchers, academics, and publishers. It automates the tedious task of parsing bibliography references, extracting Digital Object Identifiers (DOIs), and segregating papers from other citation references (books, websites, theses, and reports) with high precision.

Built using **Electron, HTML5, Vanilla CSS3, and JavaScript**, the app features a responsive design and can be packaged into a standalone Windows installer setup.

---

## 🚀 Key Features

*   **Intelligent Reference Parsing**: Automatically detects citation styles (APA, IEEE, Vancouver, Harvard, etc.) and intelligently merges multi-line entries (wrapped lines or split DOIs) into single complete records.
*   **Dual-Segregation Pipeline**:
    *   **Research Papers (with DOIs)**: Extract standard, URL-based, or prefix-based DOIs.
    *   **Other References**: Automatically categorizes non-DOI citations into books, websites, reports, theses, patents, or standards.
*   **Interactive Controls & Actions**:
    *   One-click **Select All** or individual checkbox selections.
    *   Copy selected DOIs as a single-column list with a single button.
    *   Live monospace DOI output box.
*   **Metadata Integration**: Instantly fetch academic titles, journals, and publication years directly from the **Crossref API** lookup.
*   **Aesthetic & Interactive UI**: Animating statistics counters, a live DOI success rate progress bar, a dedicated light/dark theme switch, and real-time search filtering.
*   **Drag & Drop Loading**: Load bibliography lists instantly by dropping `.txt`, `.bib`, or `.csv` files.
*   **History Logs**: Restores any of your last five extraction sessions via local cache.
*   **Multi-Format Export**: Export parsed records instantly to plain `.txt`, `.csv`, `.json`, or `.bib` (BibTeX stub).

---

## 🛠️ Installation & Packaging

The application includes a professional **Electron + NSIS Setup Installer**. To package the app on your local machine:

1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```
2.  Package and build the installer:
    ```bash
    npm run build
    ```
3.  Access the generated Windows installer (`.exe`) inside the `dist/` directory!
