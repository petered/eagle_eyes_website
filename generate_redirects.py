import os
import shutil

def main():
    # Define your redirects as a dictionary where:
    #   key   = source URL (the old URL you want to redirect from)
    #   value = destination URL (the new URL you want to redirect to)
    redirects = {
        "/help/connect-eepilot-to-caltopo": "https://docs.google.com/document/d/1FWbQLkwrYZoAAg3zbsxEeG-DClcL04zU_dSvcRDk8OA/edit?tab=t.0#bookmark=id.xe2q49a0wdsn",
        "/help/pilot-tutorials": "/pilot#tutorials",
    }
    
    output_dir = "redirects"

    # Remove the redirects directory if it exists
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
        print(f"Removed existing folder: {output_dir}")
    
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir)
    print(f"Created folder: {output_dir}")

    # Loop over the redirects and create a corresponding file for each
    for source, destination in redirects.items():
        if not source or not destination:
            print("Skipping invalid redirect entry:", source, destination)
            continue
        
        # Generate a safe file name by stripping leading/trailing slashes and replacing internal slashes with dashes.
        safe_name = source.strip("/").replace("/", "-")
        filename = os.path.join(output_dir, f"{safe_name}.md")
        
        # Create the content using Jekyll's YAML front matter.
        content = f"""---
permalink: {source}
redirect_to: "{destination}"
---
"""
        with open(filename, 'w') as file:
            file.write(content)
            print(f"Generated redirect page: '{filename}' -> {destination}")

if __name__ == "__main__":
    main()