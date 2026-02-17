import pandas as pd
import os

# ==================== YOUR PATHS ====================
folder_path = r"C:\Users\user\Documents\ADocuments\Data Requests\METEO\2026\Q2\Godfrey\data\data"
output_excel = r"C:\Users\user\Documents\ADocuments\Data Requests\METEO\2026\Q2\Godfrey\METEO_ALL_COMBINED.xlsx"
# ====================================================

columns = [
    "Timestamp", "Value1", "Pressure_hPa", "Temp_C",
    "Value4", "Humidity_%", "Value6", "Battery_%"
]

# Get all txt files
txt_files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) 
             if f.lower().endswith(".txt")]

print(f"Found {len(txt_files)} TXT files. Combining...\n")

all_dfs = []

for file in txt_files:
    df = pd.read_csv(file, sep=";", header=None, names=columns,
                     encoding="utf-8", on_bad_lines="skip")
    df["Source_File"] = os.path.basename(file)
    all_dfs.append(df)
    print(f"Loaded {len(df):6} rows  ←  {os.path.basename(file)}")

# Combine + fix timestamp for Excel
final = pd.concat(all_dfs, ignore_index=True)

# ←←← THIS IS THE ONLY IMPORTANT LINE ←←←
final["Timestamp"] = pd.to_datetime(final["Timestamp"]).dt.tz_localize(None)
# ↑ removes timezone → Excel now accepts it perfectly

final = final.sort_values("Timestamp").reset_index(drop=True)

# Save — will work instantly now
final.to_excel(output_excel, index=False, engine="openpyxl")

print(f"\nSUCCESS! {len(final):,} total rows combined")
print(f"Saved → {output_excel}")

input("\nPress Enter to close...")