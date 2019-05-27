#!/bin/sh
pattern_name=Strategy
source_dir="C:/Nikiforov/dev/design-patterns-playground/$pattern_name/src/*.cs"
usings="/tmp/usings.$pattern_name.txt"
code="/tmp/code.$pattern_name.cs"
for filename in $source_dir; do
    while IFS= read -r line
    do
        if [[ $line =~ "using" ]]; then
            echo $line >> $usings
        else
            echo $line >> $code
        fi
    done < "$filename"
done


code $code $usings
