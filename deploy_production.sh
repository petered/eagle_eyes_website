#!/bin/bash
set -e  # Exit on error

echo "Building for production..."
bundle exec jekyll build --config _config.yml,_config_production.yml

echo "Site built with production configuration"
echo "Deploy your site to your production server manually or set up CI/CD"
echo "The built site is in the _site directory" 