#!/bin/bash
set -e  # Exit on error
set -x  # Print commands before execution for debugging

echo "Building for staging..."
echo "Using config files: _config.yml and _config_staging.yml"
ls -la  # List working directory contents

# Check if config files exist
if [ -f _config.yml ]; then
  echo "_config.yml exists"
else
  echo "ERROR: _config.yml is missing"
  exit 1
fi

if [ -f _config_staging.yml ]; then
  echo "_config_staging.yml exists"
else
  echo "ERROR: _config_staging.yml is missing"
  exit 1
fi

bundle exec jekyll build --config _config.yml,_config_staging.yml

echo "Site built with staging configuration"
echo "Contents of _site directory:"
ls -la _site
echo "Deploy your site to GitHub Pages manually or set up CI/CD"
echo "The built site is in the _site directory" 