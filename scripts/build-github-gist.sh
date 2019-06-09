#!/bin/sh
pattern_name=Memento
source_dir="C:/Nikiforov/dev/design-patterns-playground/$pattern_name/src/$pattern_name/*.cs"
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
