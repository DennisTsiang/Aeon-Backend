#!/bin/bash

array=("News" "Gaming" "Business" "Social_Media" "Lifestyle" "Productivity" "Photography" "Video_Players_Editors")
for item in ${array[*]}
do
    echo "create table ${item} (id SERIAL PRIMARY KEY, total_hardware_energy DOUBLE PRECISION, total_routine_energy DOUBLE PRECISION, rating VARCHAR(40) NOT NULL, statementCoverage DOUBLE PRECISION, created_at TIMESTAMP DEFAULT NOW() );"
done | psql boostergy

