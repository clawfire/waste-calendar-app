import csv
import json
import datetime
import locale
import os
import re
import hashlib

# Map for French day names to ensure consistency regardless of system locale
DAYS_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

def parse_date(date_str):
    # format: dd/mm/yyyy
    dt = datetime.datetime.strptime(date_str, "%d/%m/%Y")
    return dt

def get_day_name(dt):
    return DAYS_FR[dt.weekday()]

def slugify(text):
    if not text:
        return ""
    # Normalize and replace unsafe characters
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def generate_ics_content(events, street_name, commune_name):
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Waste Collection//Luxembourg//FR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:Collectes {commune_name} - {street_name}",
    ]
    
    for event in events:
        # event['date_iso'] is YYYY-MM-DD
        date_str_ics = event['date_iso'].replace('-', '')
        uid = hashlib.md5(f"{street_name}{commune_name}{event['date_iso']}{event['type']}".encode()).hexdigest()
        
        lines.extend([
            "BEGIN:VEVENT",
            f"DTSTART;VALUE=DATE:{date_str_ics}",
            f"DTSTAMP:{timestamp}",
            f"UID:{uid}@waste-calendar",
            f"SUMMARY:Collecte {event['type']}",
            "STATUS:CONFIRMED",
            "TRANSP:TRANSPARENT",
            "END:VEVENT"
        ])
        
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)

def main():
    input_file = 'scripts/calendrierdechet.csv'
    output_file = 'public/waste_collection.json'
    ics_dir = 'public/ics'
    
    if not os.path.exists(ics_dir):
        os.makedirs(ics_dir)
    
    # Structure:
    # communes = {
    #   "CommuneName": {
    #       "LocalityName": {  # Can be None
    #           "StreetName": [collectes...]
    #       }
    #   }
    # }
    communes_data = {}
    
    try:
        # Use utf-8-sig to handle potential BOM
        with open(input_file, mode='r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile, delimiter=';', quotechar='"')
            
            # Normalize fieldnames
            if reader.fieldnames:
                reader.fieldnames = [name.strip().strip('"') for name in reader.fieldnames]
            
            print(f"Detected columns: {reader.fieldnames}")

            for row in reader:
                try:
                    date_str = row['Date']
                except KeyError:
                     print(f"KeyError 'Date'. Available keys: {list(row.keys())}")
                     return

                collect_type = row['Type de collecte']
                commune = row['Commune']
                localite = row['Localité']
                rue = row['Rue']
                
                # Normalize empty strings to None (or keep empty string if preferred, using None for null in JSON)
                if not localite or localite.strip() == '':
                    localite = None
                else:
                    localite = localite.strip()
                
                if not commune:
                    continue # Skip invalid rows

                try:
                    dt = parse_date(date_str)
                    date_iso = dt.strftime("%Y-%m-%d")
                    jour_semaine = get_day_name(dt)
                    
                    event = {
                        "date_iso": date_iso,
                        "jour_semaine": jour_semaine,
                        "type": collect_type
                    }

                    # Build hierarchy
                    if commune not in communes_data:
                        communes_data[commune] = {}
                    
                    if localite not in communes_data[commune]:
                        communes_data[commune][localite] = {}
                        
                    if rue not in communes_data[commune][localite]:
                        communes_data[commune][localite][rue] = []
                        
                    communes_data[commune][localite][rue].append(event)
                    
                except ValueError as e:
                    print(f"Skipping row due to error: {e}, Row: {row}")
                    continue

        # Convert to nested lists
        final_output = []
        
        # Sort communes
        sorted_commune_names = sorted(communes_data.keys())
        
        for comm_name in sorted_commune_names:
            locs_dict = communes_data[comm_name]
            localities_list = []
            
            # Sort localities (handle None)
            # We treat None as empty string for sorting comparison
            sorted_loc_keys = sorted(locs_dict.keys(), key=lambda x: (x is None, x))
            
            for loc_name in sorted_loc_keys:
                streets_dict = locs_dict[loc_name]
                streets_list = []
                
                # Sort streets
                sorted_street_names = sorted(streets_dict.keys())
                
                for street_name in sorted_street_names:
                    events = streets_dict[street_name]
                    # Sort events by date
                    events.sort(key=lambda x: x['date_iso'])
                    
                    # Generate ICS
                    # Create a deterministic filename
                    # Ensure uniqueness by including locality and commune if needed, 
                    # but typically inside a commune structure, street might repeat if we flat map, 
                    # but here we are specific. To be safe, include all parts in filename.
                    loc_slug = slugify(loc_name) if loc_name else "no-loc"
                    filename = f"{slugify(comm_name)}_{loc_slug}_{slugify(street_name)}.ics"
                    ics_path = os.path.join(ics_dir, filename)
                    
                    ics_content = generate_ics_content(events, street_name or "Toutes les rues", comm_name)
                    
                    with open(ics_path, 'w', encoding='utf-8') as f:
                        f.write(ics_content)
                    
                    streets_list.append({
                        "name": street_name,
                        "ics_filename": filename,
                        "collectes": events
                    })
                
                localities_list.append({
                    "name": loc_name,
                    "streets": streets_list
                })
            
            final_output.append({
                "commune": comm_name,
                "localities": localities_list
            })

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(final_output, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully processed {len(final_output)} communes.")
        print(f"Output saved to {output_file}")
        
    except FileNotFoundError:
        print(f"Error: File {input_file} not found.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
