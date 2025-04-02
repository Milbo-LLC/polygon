#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Convert STEP file to GLB file
# This script combines step_to_obj_converter.py and obj_to_glb_converter.py

import sys
import os
import tempfile
import subprocess

def convert_step_to_obj(input_file, output_file):
    """Convert a STEP file to OBJ using FreeCAD"""
    
    # Check if input file exists and is a STEP file
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} does not exist")
        return False
    
    if not input_file.lower().endswith(('.step', '.stp')):
        print(f"Error: Input file {input_file} is not a STEP file")
        return False
    
    # Ensure absolute paths
    input_file = os.path.abspath(input_file)
    output_file = os.path.abspath(output_file)
    
    # Make sure output file ends with .obj
    if not output_file.lower().endswith('.obj'):
        output_file += '.obj'
    
    # Generate the FreeCAD macro content
    macro_content = f"""# -*- coding: utf-8 -*-

import FreeCAD
import Part
import Mesh
import MeshPart
import sys

input_file = "{input_file}"
output_file = "{output_file}"

print(f"Converting {{input_file}} to {{output_file}}")

try:
    # Create a new document
    doc = FreeCAD.newDocument("Conversion")
    
    # Import the STEP file
    Part.insert(input_file, doc.Name)
    
    # Get all shapes in the document
    shapes = [obj.Shape for obj in doc.Objects if hasattr(obj, 'Shape')]
    
    if not shapes:
        print("No shapes found in the STEP file")
        sys.exit(1)
    
    # For the first shape, create a mesh
    shape = shapes[0]
    mesh = MeshPart.meshFromShape(
        Shape=shape,
        LinearDeflection=0.1,
        AngularDeflection=0.1,
        Relative=False,
        Segments=True
    )
    
    # Export the mesh as OBJ
    mesh.write(output_file)
    
    print(f"Successfully converted {{input_file}} to {{output_file}}")
    FreeCAD.closeDocument(doc.Name)
    sys.exit(0)
except Exception as e:
    print(f"Error: {{str(e)}}")
    sys.exit(1)
"""

    # Create a temporary file
    with tempfile.NamedTemporaryFile(suffix='.FCMacro', delete=False) as temp_file:
        temp_macro_path = temp_file.name
        temp_file.write(macro_content.encode('utf-8'))
    
    try:
        # Build the FreeCAD command
        freecad_path = "/Applications/FreeCAD.app/Contents/MacOS/FreeCAD"
        
        # Make sure FreeCAD exists
        if not os.path.exists(freecad_path):
            print(f"Error: FreeCAD not found at {freecad_path}")
            return False
        
        # Run the command
        cmd = [freecad_path, '-c', f"exec(open('{temp_macro_path}').read())"]
        print(f"Running STEP to OBJ conversion: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Print output
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr)
        
        # Check if conversion was successful
        if result.returncode != 0:
            print(f"Error: FreeCAD command failed with return code {result.returncode}")
            return False
        
        # Verify output file was created
        if not os.path.exists(output_file):
            print(f"Error: Output file {output_file} was not created")
            return False
        
        return True
    
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_macro_path):
            os.remove(temp_macro_path)

def convert_obj_to_glb(input_file, output_file):
    """Convert an OBJ file to GLB using obj2gltf"""
    
    # Check if input file exists and is an OBJ file
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} does not exist")
        return False
    
    if not input_file.lower().endswith('.obj'):
        print(f"Error: Input file {input_file} is not an OBJ file")
        return False
    
    # Ensure absolute paths
    input_file = os.path.abspath(input_file)
    output_file = os.path.abspath(output_file)
    
    # Make sure output file ends with .glb
    if not output_file.lower().endswith('.glb'):
        output_file += '.glb'
    
    try:
        # Run obj2gltf using npx
        cmd = ['npx', 'obj2gltf', '-i', input_file, '-o', output_file]
        print(f"Running OBJ to GLB conversion: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Print output
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr)
        
        # Check if conversion was successful
        if result.returncode != 0:
            print(f"Error: obj2gltf command failed with return code {result.returncode}")
            return False
        
        # Verify output file was created
        if not os.path.exists(output_file):
            print(f"Error: Output file {output_file} was not created")
            return False
        
        return True
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def convert_step_to_glb(input_file, output_file, keep_obj=False):
    """Convert a STEP file to GLB through an intermediate OBJ file"""
    
    # Check input file
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} does not exist")
        return False
    
    if not input_file.lower().endswith(('.step', '.stp')):
        print(f"Error: Input file {input_file} is not a STEP file")
        return False
    
    # Ensure absolute paths
    input_file = os.path.abspath(input_file)
    output_file = os.path.abspath(output_file)
    
    # Make sure output file ends with .glb
    if not output_file.lower().endswith('.glb'):
        output_file += '.glb'
    
    # Create a temporary file for the intermediate OBJ
    if keep_obj:
        # If keep_obj is True, save the OBJ alongside the GLB
        obj_file = os.path.splitext(output_file)[0] + '.obj'
    else:
        # Otherwise, use a temporary file
        temp_obj = tempfile.NamedTemporaryFile(suffix='.obj', delete=False)
        obj_file = temp_obj.name
        temp_obj.close()
    
    try:
        # Step 1: Convert STEP to OBJ
        print(f"Step 1: Converting STEP to OBJ...")
        if not convert_step_to_obj(input_file, obj_file):
            print("Step 1 failed: STEP to OBJ conversion")
            return False
        
        # Step 2: Convert OBJ to GLB
        print(f"Step 2: Converting OBJ to GLB...")
        if not convert_obj_to_glb(obj_file, output_file):
            print("Step 2 failed: OBJ to GLB conversion")
            return False
        
        print(f"Successfully converted {input_file} to {output_file}")
        return True
    
    finally:
        # Clean up the temporary OBJ file if we're not keeping it
        if not keep_obj and os.path.exists(obj_file):
            os.remove(obj_file)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Convert STEP files to GLB")
    parser.add_argument("input", help="Input STEP file")
    parser.add_argument("output", help="Output GLB file")
    parser.add_argument("--keep-obj", action="store_true", help="Keep the intermediate OBJ file")
    
    args = parser.parse_args()
    
    if convert_step_to_glb(args.input, args.output, args.keep_obj):
        print(f"Conversion completed: {args.input} -> {args.output}")
        sys.exit(0)
    else:
        print(f"Conversion failed: {args.input} -> {args.output}")
        sys.exit(1) 