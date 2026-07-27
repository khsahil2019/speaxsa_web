#!/bin/bash
set -e

echo "===================================="
echo " SPEAXA Safe Database Migration"
echo "===================================="

node database/migrator.js

echo "===================================="
echo " Migration Complete — Data Preserved!"
echo "===================================="
