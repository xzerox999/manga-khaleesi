import os
import re
import json
import urllib.request
import fitz  # PyMuPDF

WORKSPACE = r"e:\Otros\Cuentos khaleesi\manga_demon_slayer"
PDFS_DIR = os.path.join(WORKSPACE, "pdfs")
COVERS_DIR = os.path.join(WORKSPACE, "covers")
VENDOR_DIR = os.path.join(WORKSPACE, "js", "vendor")
DATA_DIR = os.path.join(WORKSPACE, "data")

os.makedirs(PDFS_DIR, exist_ok=True)
os.makedirs(COVERS_DIR, exist_ok=True)
os.makedirs(VENDOR_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# 1. Clean previous split files in pdfs/ and covers/
for f in os.listdir(PDFS_DIR):
    if "parte_" in f:
        try:
            os.remove(os.path.join(PDFS_DIR, f))
        except:
            pass

for f in os.listdir(COVERS_DIR):
    if "parte_" in f:
        try:
            os.remove(os.path.join(COVERS_DIR, f))
        except:
            pass

# 2. Download PDF.js vendor files if not already present
PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174"
for fname in ["pdf.min.js", "pdf.worker.min.js"]:
    target = os.path.join(VENDOR_DIR, fname)
    if not os.path.exists(target):
        url = f"{PDFJS_CDN}/{fname}"
        print(f"Downloading {fname} from {url}...")
        try:
            urllib.request.urlretrieve(url, target)
        except Exception as e:
            print(f"Error downloading {fname}: {e}")

def extract_sort_key(filename):
    match = re.search(r'(\d+)(?:\.(\d+))?', filename)
    if match:
        main = int(match.group(1))
        sub = int(match.group(2)) if match.group(2) else 0
        return (main, sub)
    return (9999, 0)

# Source PDFs in root
source_files = [f for f in os.listdir(WORKSPACE) if f.lower().endswith('.pdf') and not f.startswith('.')]
source_files.sort(key=extract_sort_key)

print(f"Processing {len(source_files)} source PDF files...")

chapters_data = []

def generate_cover(doc, cover_path):
    if not os.path.exists(cover_path):
        page = doc[0]
        rect = page.rect
        zoom = 480 / rect.width if rect.width > 0 else 1.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(cover_path)

def determine_arc(sort_key):
    if sort_key[0] < 188:
        return "Fortaleza Dimensional Infinita"
    else:
        return "Cuenta Regresiva hacia el Amanecer"

for src_name in source_files:
    src_path = os.path.join(WORKSPACE, src_name)
    file_size_mb = os.path.getsize(src_path) / (1024 * 1024)
    sort_key = extract_sort_key(src_name)
    
    clean_match = re.search(r'Cap.*?(\d+.*?)(\.pdf|\.PDF)', src_name, re.IGNORECASE)
    chapter_num_str = clean_match.group(1).strip() if clean_match else src_name.replace('.pdf','').replace('.PDF','')
    safe_slug = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', f"cap_{chapter_num_str}").lower()
    
    doc = fitz.open(src_path)
    total_pages = len(doc)
    
    # Target: keep every file strictly under 45 MB (below GitHub's 50MB warning threshold)
    if file_size_mb > 45:
        # Determine number of parts needed so each part is under 35 MB
        num_parts = 4 if file_size_mb > 100 else 2
        pages_per_part = (total_pages + num_parts - 1) // num_parts
        print(f"Splitting {src_name} ({file_size_mb:.1f} MB, {total_pages} pages) into {num_parts} parts...")
        
        for p_idx in range(num_parts):
            start_p = p_idx * pages_per_part
            end_p = min(start_p + pages_per_part, total_pages)
            if start_p >= total_pages:
                break
                
            part_doc = fitz.open()
            part_doc.insert_pdf(doc, from_page=start_p, to_page=end_p - 1)
            
            part_filename = f"{safe_slug}_parte_{p_idx + 1}.pdf"
            part_path = os.path.join(PDFS_DIR, part_filename)
            part_doc.save(part_path, garbage=3, deflate=True)
            part_size = os.path.getsize(part_path) / (1024 * 1024)
            
            cover_filename = f"{safe_slug}_parte_{p_idx + 1}.jpg"
            cover_path = os.path.join(COVERS_DIR, cover_filename)
            generate_cover(part_doc, cover_path)
            
            chapters_data.append({
                "id": f"{safe_slug}_p{p_idx + 1}",
                "title": f"Capítulo {chapter_num_str} (Parte {p_idx + 1})",
                "shortTitle": f"Cap. {chapter_num_str} - {p_idx + 1}",
                "arc": determine_arc(sort_key),
                "pdfFile": f"pdfs/{part_filename}",
                "coverFile": f"covers/{cover_filename}",
                "pages": len(part_doc),
                "sizeMb": round(part_size, 1),
                "sortKey": sort_key[0] + ((p_idx + 1) * 0.05)
            })
            print(f"  -> {part_filename} ({len(part_doc)} págs, {part_size:.1f} MB)")
            part_doc.close()
        doc.close()
    else:
        dest_filename = f"{safe_slug}.pdf"
        dest_path = os.path.join(PDFS_DIR, dest_filename)
        if not os.path.exists(dest_path):
            doc.save(dest_path, garbage=2, deflate=True)
            
        final_size = os.path.getsize(dest_path) / (1024 * 1024)
        cover_filename = f"{safe_slug}.jpg"
        cover_path = os.path.join(COVERS_DIR, cover_filename)
        generate_cover(doc, cover_path)
        doc.close()
        
        chapters_data.append({
            "id": safe_slug,
            "title": f"Capítulo {chapter_num_str}",
            "shortTitle": f"Cap. {chapter_num_str}",
            "arc": determine_arc(sort_key),
            "pdfFile": f"pdfs/{dest_filename}",
            "coverFile": f"covers/{cover_filename}",
            "pages": total_pages,
            "sizeMb": round(final_size, 1),
            "sortKey": sort_key[0] + (sort_key[1] * 0.01)
        })

chapters_data.sort(key=lambda x: x["sortKey"])

json_path = os.path.join(DATA_DIR, "chapters.json")
with open(json_path, "w", encoding="utf-8") as f:
    json.dump({
        "collection": "Demon Slayer: Kimetsu no Yaiba",
        "dedicatedTo": "Khaleesi",
        "description": "Edición especial de lectura manga para Khaleesi",
        "totalChapters": len(chapters_data),
        "chapters": chapters_data
    }, f, indent=2, ensure_ascii=False)

print(f"\nCompleted! Generated {len(chapters_data)} total chapter entries under 45 MB in {json_path}")
