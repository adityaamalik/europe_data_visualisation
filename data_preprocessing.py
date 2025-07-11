"""
EuroLife Dashboard - Data Preprocessing Script
Group 4: Aditya Malik, Aakrshan Sharma
Course: 6171 UE Exercise: Data Visualization (SoSe 25)

This script preprocesses the raw Eurostat datasets for the EuroLife Dashboard.
It handles data cleaning, standardization, and preparation for D3.js visualization.
"""

import pandas as pd
import numpy as np
import json
import os
from pathlib import Path

# Configuration
RAW_DATA_DIR = "Datasets - Task 2/raw"
CLEANED_DATA_DIR = "Datasets - Task 2/cleaned"
TARGET_YEARS = [2013, 2018, 2021, 2022, 2023]

# Create cleaned data directory if it doesn't exist
Path(CLEANED_DATA_DIR).mkdir(parents=True, exist_ok=True)

def print_separator(title):
    """Print a formatted separator for better output readability"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def load_and_analyze_data(file_path, dataset_name):
    """Load dataset and perform initial analysis"""
    print(f"\n📊 Loading {dataset_name}...")
    
    if not os.path.exists(file_path):
        print(f"❌ Error: File not found - {file_path}")
        return None
    
    df = pd.read_csv(file_path, encoding='utf-8')
    
    print(f"✅ Loaded successfully!")
    print(f"   Shape: {df.shape}")
    print(f"   Columns: {list(df.columns)}")
    print(f"   Missing values: {df.isnull().sum().sum()}")
    
    return df

def standardize_country_codes(df, country_column):
    """Standardize country codes and names"""
    print(f"\n🔧 Standardizing country codes in column: {country_column}")
    
    # Country code mapping for common variations
    country_mapping = {
        'EL': 'GR',  # Greece (Eurostat uses EL, but GR is more common)
        'UK': 'GB',  # United Kingdom
        'XK': 'XK',  # Kosovo (keep as is)
    }
    
    if country_column in df.columns:
        # Apply mapping
        df[country_column] = df[country_column].replace(country_mapping)
        
        # Remove any whitespace
        df[country_column] = df[country_column].astype(str).str.strip()
        
        print(f"   Unique countries: {df[country_column].nunique()}")
        print(f"   Countries: {sorted(df[country_column].unique())}")
    
    return df

def filter_target_years(df, year_column):
    """Filter data to target years only"""
    print(f"\n📅 Filtering to target years: {TARGET_YEARS}")
    
    if year_column in df.columns:
        initial_count = len(df)
        df = df[df[year_column].isin(TARGET_YEARS)]
        final_count = len(df)
        
        print(f"   Filtered from {initial_count} to {final_count} rows")
        print(f"   Available years: {sorted(df[year_column].unique())}")
    
    return df

def clean_life_satisfaction_data():
    """Clean and prepare life satisfaction dataset"""
    print_separator("CLEANING LIFE SATISFACTION DATA")
    
    # Load data
    df = load_and_analyze_data(
        f"{RAW_DATA_DIR}/eurostat_life_satisfaction.csv",
        "Life Satisfaction Dataset"
    )
    
    if df is None:
        return None
    
    print(f"\n🔍 Original columns: {list(df.columns)}")
    
    # Identify key columns (adjust based on your actual column names)
    # Common Eurostat column patterns
    possible_country_cols = ['geo', 'GEO', 'country', 'COUNTRY', 'geo\\time']
    possible_time_cols = ['time', 'TIME', 'year', 'YEAR']
    possible_value_cols = ['values', 'VALUE', 'life_satisfaction', 'satisfaction']
    
    # Find actual column names
    country_col = None
    time_col = None
    value_col = None
    
    for col in df.columns:
        if any(pc.lower() in col.lower() for pc in possible_country_cols):
            country_col = col
        elif any(tc.lower() in col.lower() for tc in possible_time_cols):
            time_col = col
        elif any(vc.lower() in col.lower() for vc in possible_value_cols):
            value_col = col
    
    print(f"   Detected country column: {country_col}")
    print(f"   Detected time column: {time_col}")
    print(f"   Detected value column: {value_col}")
    
    # If columns are not found, check for numeric columns that might be years
    if time_col is None:
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df[col].min() >= 2000 and df[col].max() <= 2030:
                time_col = col
                print(f"   Found time column by pattern: {time_col}")
                break
    
    # Handle pivoted data (years as columns)
    if time_col is None:
        year_columns = [col for col in df.columns if col.isdigit() and int(col) in TARGET_YEARS]
        if year_columns:
            print(f"   Found year columns: {year_columns}")
            # Melt the dataframe
            id_vars = [col for col in df.columns if col not in year_columns]
            df = pd.melt(df, id_vars=id_vars, value_vars=year_columns, 
                        var_name='year', value_name='life_satisfaction')
            df['year'] = df['year'].astype(int)
            time_col = 'year'
            value_col = 'life_satisfaction'
    
    # Standardize column names
    column_mapping = {}
    if country_col:
        column_mapping[country_col] = 'country'
    if time_col:
        column_mapping[time_col] = 'year'
    if value_col:
        column_mapping[value_col] = 'life_satisfaction'
    
    df = df.rename(columns=column_mapping)
    
    # Ensure we have the essential columns
    required_cols = ['country', 'year', 'life_satisfaction']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"❌ Missing required columns: {missing_cols}")
        return None
    
    # Clean data
    print(f"\n🧹 Cleaning data...")
    initial_rows = len(df)
    
    # Remove rows with missing countries
    df = df.dropna(subset=['country'])
    print(f"   Removed {initial_rows - len(df)} rows with missing countries")
    
    # Standardize country codes
    df = standardize_country_codes(df, 'country')
    
    # Filter to target years
    df = filter_target_years(df, 'year')
    
    # Clean life satisfaction values
    df['life_satisfaction'] = pd.to_numeric(df['life_satisfaction'], errors='coerce')
    
    # Remove invalid satisfaction scores (should be 0-10)
    before_filter = len(df)
    df = df[(df['life_satisfaction'] >= 0) & (df['life_satisfaction'] <= 10)]
    print(f"   Removed {before_filter - len(df)} rows with invalid satisfaction scores")
    
    # Handle missing values with country-year median
    missing_satisfaction = df['life_satisfaction'].isnull().sum()
    if missing_satisfaction > 0:
        print(f"   Imputing {missing_satisfaction} missing satisfaction values...")
        # Fill with country median first, then overall median
        df['life_satisfaction'] = df.groupby('country')['life_satisfaction'].transform(
            lambda x: x.fillna(x.median())
        )
        df['life_satisfaction'] = df['life_satisfaction'].fillna(df['life_satisfaction'].median())
    
    # Keep only essential columns and any additional demographic columns
    essential_cols = ['country', 'year', 'life_satisfaction']
    additional_cols = [col for col in df.columns if col not in essential_cols and 
                      col.lower() not in ['unnamed', 'index'] and not col.startswith('Unnamed')]
    
    final_cols = essential_cols + additional_cols[:3]  # Keep up to 3 additional columns
    df = df[final_cols]
    
    print(f"   Final shape: {df.shape}")
    print(f"   Final columns: {list(df.columns)}")
    
    return df

def clean_income_data():
    """Clean and prepare income dataset"""
    print_separator("CLEANING INCOME DATA")
    
    # Load data
    df = load_and_analyze_data(
        f"{RAW_DATA_DIR}/eurostat_income.csv",
        "Income Dataset"
    )
    
    if df is None:
        return None
    
    print(f"\n🔍 Original columns: {list(df.columns)}")
    
    # Similar approach as life satisfaction
    possible_country_cols = ['geo', 'GEO', 'country', 'COUNTRY', 'geo\\time']
    possible_time_cols = ['time', 'TIME', 'year', 'YEAR']
    possible_value_cols = ['values', 'VALUE', 'income', 'median', 'disposable']
    
    # Find actual column names
    country_col = None
    time_col = None
    value_col = None
    
    for col in df.columns:
        if any(pc.lower() in col.lower() for pc in possible_country_cols):
            country_col = col
        elif any(tc.lower() in col.lower() for tc in possible_time_cols):
            time_col = col
        elif any(vc.lower() in col.lower() for vc in possible_value_cols):
            value_col = col
    
    print(f"   Detected country column: {country_col}")
    print(f"   Detected time column: {time_col}")
    print(f"   Detected value column: {value_col}")
    
    # Handle pivoted data (years as columns)
    if time_col is None:
        year_columns = [col for col in df.columns if col.isdigit() and int(col) in TARGET_YEARS]
        if year_columns:
            print(f"   Found year columns: {year_columns}")
            # Melt the dataframe
            id_vars = [col for col in df.columns if col not in year_columns]
            df = pd.melt(df, id_vars=id_vars, value_vars=year_columns, 
                        var_name='year', value_name='median_income')
            df['year'] = df['year'].astype(int)
            time_col = 'year'
            value_col = 'median_income'
    
    # Standardize column names
    column_mapping = {}
    if country_col:
        column_mapping[country_col] = 'country'
    if time_col:
        column_mapping[time_col] = 'year'
    if value_col:
        column_mapping[value_col] = 'median_income'
    
    df = df.rename(columns=column_mapping)
    
    # Ensure we have the essential columns
    required_cols = ['country', 'year', 'median_income']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"❌ Missing required columns: {missing_cols}")
        return None
    
    # Clean data
    print(f"\n🧹 Cleaning data...")
    initial_rows = len(df)
    
    # Remove rows with missing countries
    df = df.dropna(subset=['country'])
    print(f"   Removed {initial_rows - len(df)} rows with missing countries")
    
    # Standardize country codes
    df = standardize_country_codes(df, 'country')
    
    # Filter to target years
    df = filter_target_years(df, 'year')
    
    # Clean income values
    df['median_income'] = pd.to_numeric(df['median_income'], errors='coerce')
    
    # Remove invalid income values (negative or zero)
    before_filter = len(df)
    df = df[df['median_income'] > 0]
    print(f"   Removed {before_filter - len(df)} rows with invalid income values")
    
    # Handle missing values with country median
    missing_income = df['median_income'].isnull().sum()
    if missing_income > 0:
        print(f"   Imputing {missing_income} missing income values...")
        df['median_income'] = df.groupby('country')['median_income'].transform(
            lambda x: x.fillna(x.median())
        )
        df['median_income'] = df['median_income'].fillna(df['median_income'].median())
    
    # Keep only essential columns and any additional demographic columns
    essential_cols = ['country', 'year', 'median_income']
    additional_cols = [col for col in df.columns if col not in essential_cols and 
                      col.lower() not in ['unnamed', 'index'] and not col.startswith('Unnamed')]
    
    final_cols = essential_cols + additional_cols[:3]  # Keep up to 3 additional columns
    df = df[final_cols]
    
    print(f"   Final shape: {df.shape}")
    print(f"   Final columns: {list(df.columns)}")
    
    return df

def clean_geographic_data():
    """Clean and prepare geographic dataset"""
    print_separator("CLEANING GEOGRAPHIC DATA")
    
    # Load GeoJSON
    geo_file = f"{RAW_DATA_DIR}/european_countries.json"
    
    if not os.path.exists(geo_file):
        print(f"❌ Error: File not found - {geo_file}")
        return None
    
    print(f"📊 Loading Geographic Dataset...")
    
    with open(geo_file, 'r', encoding='utf-8') as f:
        geo_data = json.load(f)
    
    print(f"✅ Loaded successfully!")
    print(f"   Type: {geo_data.get('type', 'Unknown')}")
    print(f"   Features: {len(geo_data.get('features', []))}")
    
    # Clean properties
    if 'features' in geo_data:
        print(f"\n🧹 Cleaning geographic properties...")
        
        for feature in geo_data['features']:
            if 'properties' in feature:
                props = feature['properties']
                
                # Standardize country code property
                if 'CNTR_CODE' in props:
                    props['country_code'] = props['CNTR_CODE']
                elif 'iso_a2' in props:
                    props['country_code'] = props['iso_a2']
                
                # Ensure country name
                if 'NAME_LATN' in props:
                    props['country_name'] = props['NAME_LATN']
                elif 'name' in props:
                    props['country_name'] = props['name']
        
        print(f"   Cleaned properties for {len(geo_data['features'])} features")
    
    return geo_data

def validate_data_consistency(life_satisfaction_df, income_df):
    """Validate consistency between datasets"""
    print_separator("VALIDATING DATA CONSISTENCY")
    
    if life_satisfaction_df is None or income_df is None:
        print("❌ Cannot validate - one or more datasets failed to load")
        return False
    
    # Check country overlap
    ls_countries = set(life_satisfaction_df['country'].unique())
    income_countries = set(income_df['country'].unique())
    
    common_countries = ls_countries.intersection(income_countries)
    only_ls = ls_countries - income_countries
    only_income = income_countries - ls_countries
    
    print(f"📊 Country Coverage Analysis:")
    print(f"   Life Satisfaction countries: {len(ls_countries)}")
    print(f"   Income countries: {len(income_countries)}")
    print(f"   Common countries: {len(common_countries)}")
    
    if only_ls:
        print(f"   Only in Life Satisfaction: {sorted(only_ls)}")
    if only_income:
        print(f"   Only in Income: {sorted(only_income)}")
    
    # Check year overlap
    ls_years = set(life_satisfaction_df['year'].unique())
    income_years = set(income_df['year'].unique())
    
    common_years = ls_years.intersection(income_years)
    
    print(f"\n📅 Year Coverage Analysis:")
    print(f"   Life Satisfaction years: {sorted(ls_years)}")
    print(f"   Income years: {sorted(income_years)}")
    print(f"   Common years: {sorted(common_years)}")
    
    # Check data quality
    print(f"\n🔍 Data Quality Check:")
    print(f"   Life Satisfaction - Min: {life_satisfaction_df['life_satisfaction'].min():.2f}, Max: {life_satisfaction_df['life_satisfaction'].max():.2f}")
    print(f"   Income - Min: {income_df['median_income'].min():.0f}, Max: {income_df['median_income'].max():.0f}")
    
    return len(common_countries) >= 20 and len(common_years) >= 3

def save_cleaned_datasets(life_satisfaction_df, income_df, geo_data):
    """Save cleaned datasets"""
    print_separator("SAVING CLEANED DATASETS")
    
    try:
        # Save life satisfaction
        if life_satisfaction_df is not None:
            output_file = f"{CLEANED_DATA_DIR}/eurostat_life_satisfaction.csv"
            life_satisfaction_df.to_csv(output_file, index=False)
            print(f"✅ Saved: {output_file}")
        
        # Save income
        if income_df is not None:
            output_file = f"{CLEANED_DATA_DIR}/eurostat_income.csv"
            income_df.to_csv(output_file, index=False)
            print(f"✅ Saved: {output_file}")
        
        # Save geographic data
        if geo_data is not None:
            output_file = f"{CLEANED_DATA_DIR}/european_countries.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(geo_data, f, ensure_ascii=False, indent=2)
            print(f"✅ Saved: {output_file}")
        
        print(f"\n🎉 All datasets successfully preprocessed and saved!")
        
    except Exception as e:
        print(f"❌ Error saving datasets: {e}")

def main():
    """Main preprocessing pipeline"""
    print("🚀 EuroLife Dashboard - Data Preprocessing Pipeline")
    print("="*60)
    
    # Clean individual datasets
    life_satisfaction_df = clean_life_satisfaction_data()
    income_df = clean_income_data()
    geo_data = clean_geographic_data()
    
    # Validate consistency
    is_valid = validate_data_consistency(life_satisfaction_df, income_df)
    
    if is_valid:
        print("✅ Data validation passed!")
    else:
        print("⚠️  Data validation warnings - check the output above")
    
    # Save cleaned datasets
    save_cleaned_datasets(life_satisfaction_df, income_df, geo_data)
    
    print(f"\n📋 Preprocessing Summary:")
    if life_satisfaction_df is not None:
        print(f"   Life Satisfaction: {len(life_satisfaction_df)} records")
    if income_df is not None:
        print(f"   Income: {len(income_df)} records")
    if geo_data is not None:
        print(f"   Geographic: {len(geo_data.get('features', []))} countries")
    
    print(f"\n🎯 Ready for visualization! Your cleaned datasets are in: {CLEANED_DATA_DIR}")

if __name__ == "__main__":
    main()