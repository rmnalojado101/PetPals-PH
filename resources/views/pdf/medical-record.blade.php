<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Medical Record - {{ $record->pet->name }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #1e1b4b;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #1e1b4b;
            margin: 0;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            background-color: #1e1b4b;
            color: white;
            padding: 8px 12px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .info-grid {
            display: table;
            width: 100%;
        }
        .info-row {
            display: table-row;
        }
        .info-label {
            display: table-cell;
            font-weight: bold;
            padding: 5px 10px 5px 0;
            width: 150px;
        }
        .info-value {
            display: table-cell;
            padding: 5px 0;
        }
        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PetPals PH </h1>
        <p>Medical Record</p>
        <p>Record ID: {{ $record->id }}</p>
    </div>

    <div class="section">
        <div class="section-title">Pet Information</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Name:</div>
                <div class="info-value">{{ $record->pet->name }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Species:</div>
                <div class="info-value">{{ ucfirst($record->pet->species) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Breed:</div>
                <div class="info-value">{{ $record->pet->breed }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Owner:</div>
                <div class="info-value">{{ $record->pet->owner->name }}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Visit Details</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Date:</div>
                <div class="info-value">{{ $record->record_date->format('F d, Y') }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Veterinarian:</div>
                <div class="info-value">{{ $record->veterinarian->name }}</div>
            </div>
            @if($record->weight)
            <div class="info-row">
                <div class="info-label">Weight:</div>
                <div class="info-value">{{ $record->weight }} kg</div>
            </div>
            @endif
            @if($record->temperature)
            <div class="info-row">
                <div class="info-label">Temperature:</div>
                <div class="info-value">{{ $record->temperature }}°C</div>
            </div>
            @endif
        </div>
    </div>

    <div class="section">
        <div class="section-title">Diagnosis</div>
        <p>{{ $record->diagnosis }}</p>
    </div>

    <div class="section">
        <div class="section-title">Treatment</div>
        <p>{{ $record->treatment }}</p>
    </div>

    @if($record->prescription)
    <div class="section">
        <div class="section-title">Prescription</div>
        <p>{{ $record->prescription }}</p>
    </div>
    @endif

    @if($record->lab_results)
    <div class="section">
        <div class="section-title">Lab Results</div>
        <p>{{ $record->lab_results }}</p>
    </div>
    @endif

    @if($record->notes)
    <div class="section">
        <div class="section-title">Additional Notes</div>
        <p>{{ $record->notes }}</p>
    </div>
    @endif

    @if($record->follow_up_date)
    <div class="section">
        <div class="section-title">Follow-up</div>
        <p>Scheduled follow-up: {{ $record->follow_up_date->format('F d, Y') }}</p>
    </div>
    @endif

    <div class="footer">
        <p>Generated on {{ now()->format('F d, Y h:i A') }} | PetPals PH</p>
        <p>This document is for medical reference purposes.</p>
    </div>
</body>
</html>
