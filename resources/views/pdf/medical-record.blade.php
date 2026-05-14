<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Medical Record - {{ $record->pet->name }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            line-height: 1.45;
            color: #1f2937;
            margin: 24px 28px 92px;
        }
        .document-header {
            border-bottom: 3px solid #0f766e;
            padding-bottom: 14px;
            margin-bottom: 18px;
        }
        .brand-title {
            font-size: 24px;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 4px;
        }
        .brand-meta,
        .sub-meta {
            font-size: 10px;
            color: #475569;
            margin: 2px 0;
        }
        .document-title {
            font-size: 18px;
            font-weight: bold;
            color: #0f766e;
            margin: 14px 0 4px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .summary-grid,
        .two-column {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .summary-grid td,
        .two-column td {
            vertical-align: top;
            width: 50%;
        }
        .box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px;
            margin-right: 8px;
            min-height: 120px;
        }
        .box-right {
            margin-right: 0;
            margin-left: 8px;
        }
        .section {
            margin-bottom: 14px;
        }
        .section-title {
            background: #0f766e;
            color: #ffffff;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 10px;
            padding: 7px 10px;
            margin-bottom: 8px;
        }
        .detail-table {
            width: 100%;
            border-collapse: collapse;
        }
        .detail-table td {
            padding: 4px 0;
            vertical-align: top;
        }
        .detail-label {
            width: 34%;
            font-weight: bold;
            color: #334155;
            padding-right: 10px;
        }
        .narrative {
            border: 1px solid #dbe4ee;
            background: #f8fafc;
            padding: 10px 12px;
            min-height: 54px;
        }
        .muted {
            color: #64748b;
        }
        .pill-row {
            margin: 10px 0 0;
        }
        .pill {
            display: inline-block;
            border: 1px solid #99f6e4;
            background: #ecfeff;
            color: #115e59;
            padding: 4px 8px;
            margin: 0 6px 6px 0;
            border-radius: 999px;
            font-size: 10px;
        }
        .signature-block {
            margin-top: 24px;
        }
        .signature-line {
            margin-top: 28px;
            border-top: 1px solid #94a3b8;
            width: 230px;
            padding-top: 6px;
            font-size: 10px;
            color: #475569;
        }
        .footer {
            position: fixed;
            left: 28px;
            right: 28px;
            bottom: 18px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            font-size: 9px;
            color: #64748b;
            text-align: center;
        }
    </style>
</head>
<body>
    @php
        $linkedClinic = $record->veterinarian?->clinic;
        $settingsName = trim((string) ($clinic->name ?? ''));
        $placeholderNames = ['petpals ph', 'veterinary clinic', 'your veterinary clinic'];
        $clinicName = $settingsName !== '' && !in_array(strtolower($settingsName), $placeholderNames, true)
            ? $settingsName
            : trim((string) ($linkedClinic->name ?? ''));
        $clinicName = $clinicName !== '' ? $clinicName : 'Veterinary Clinic';

        $clinicAddress = trim((string) ($clinic->address ?? '')) ?: trim((string) ($linkedClinic->address ?? ''));
        $clinicPhone = trim((string) ($clinic->phone ?? '')) ?: trim((string) ($linkedClinic->phone ?? ''));
        $clinicEmail = trim((string) ($clinic->email ?? '')) ?: trim((string) ($linkedClinic->email ?? ''));

        $allergies = is_array($record->pet->allergies ?? null) ? array_filter($record->pet->allergies) : [];
        $clinicalDetails = is_array($record->clinical_details ?? null)
            ? array_filter($record->clinical_details, function ($value) {
                if (is_array($value)) {
                    return count(array_filter($value, fn ($nested) => filled($nested))) > 0;
                }
                return filled($value);
            })
            : [];
        $visitReason = $record->appointment?->reason;
        $attachmentLabel = $record->attachment_name ?: ($record->attachment_path ? basename($record->attachment_path) : null);
        $owner = $record->pet->owner;
        $pet = $record->pet;
        $vet = $record->veterinarian;
    @endphp

    <div class="document-header">
        <div class="brand-title">{{ $clinicName }}</div>
        @if($clinicAddress)
            <div class="brand-meta">{{ $clinicAddress }}</div>
        @endif
        <div class="brand-meta">
            @if($clinicPhone)
                Tel: {{ $clinicPhone }}
            @endif
            @if($clinicPhone && $clinicEmail)
                |
            @endif
            @if($clinicEmail)
                Email: {{ $clinicEmail }}
            @endif
        </div>

        <div class="document-title">Veterinary Medical Record</div>
        <div class="sub-meta">Record No. {{ $record->id }} | Visit Date: {{ $record->record_date->format('F d, Y') }} | Generated: {{ now()->format('F d, Y h:i A') }}</div>
    </div>

    <table class="summary-grid">
        <tr>
            <td>
                <div class="box">
                    <div class="section-title">Patient Information</div>
                    <table class="detail-table">
                        <tr><td class="detail-label">Patient Name</td><td>{{ $pet->name }}</td></tr>
                        <tr><td class="detail-label">Species</td><td>{{ ucfirst($pet->species) }}</td></tr>
                        <tr><td class="detail-label">Breed</td><td>{{ $pet->breed ?: 'Not provided' }}</td></tr>
                        <tr><td class="detail-label">Sex</td><td>{{ ucfirst($pet->sex ?? 'Unknown') }}</td></tr>
                        <tr><td class="detail-label">Age</td><td>{{ $pet->age ? $pet->age . ' year(s)' : 'Not provided' }}</td></tr>
                        <tr><td class="detail-label">Color / Markings</td><td>{{ $pet->color ?: 'Not provided' }}</td></tr>
                        <tr><td class="detail-label">Microchip ID</td><td>{{ $pet->microchip_id ?: 'Not provided' }}</td></tr>
                        <tr><td class="detail-label">Recorded Weight</td><td>{{ $record->weight ? $record->weight . ' kg' : ($pet->weight ? $pet->weight . ' kg' : 'Not provided') }}</td></tr>
                    </table>
                </div>
            </td>
            <td>
                <div class="box box-right">
                    <div class="section-title">Owner and Consultation Details</div>
                    <table class="detail-table">
                        <tr><td class="detail-label">Owner Name</td><td>{{ $owner->name }}</td></tr>
                        <tr><td class="detail-label">Phone</td><td>{{ $owner->phone ?: 'Not provided' }}</td></tr>
                        <tr><td class="detail-label">Email</td><td>{{ $owner->email ?: 'Not provided' }}</td></tr>
                        <tr><td class="detail-label">Address</td><td>{{ $owner->address ?: 'Not provided' }}</td></tr>
                        <tr><td class="detail-label">Attending Veterinarian</td><td>{{ $vet?->name ?: 'Not provided' }}</td></tr>
                        <tr><td class="detail-label">Veterinarian Contact</td><td>{{ $vet?->phone ?: ($vet?->email ?: 'Not provided') }}</td></tr>
                        <tr><td class="detail-label">Appointment Reference</td><td>{{ $record->appointment_id ?: 'Walk-in / Direct entry' }}</td></tr>
                        <tr><td class="detail-label">Follow-up Date</td><td>{{ $record->follow_up_date ? $record->follow_up_date->format('F d, Y') : 'Not scheduled' }}</td></tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>

    <div class="section">
        <div class="section-title">Consultation Summary</div>
        <table class="detail-table">
            <tr><td class="detail-label">Reason for Visit</td><td>{{ $visitReason ?: 'Not documented' }}</td></tr>
            <tr><td class="detail-label">Temperature</td><td>{!! $record->temperature ? e($record->temperature) . ' &deg;C' : 'Not recorded' !!}</td></tr>
            <tr><td class="detail-label">Known Allergies</td><td>{{ count($allergies) > 0 ? implode(', ', $allergies) : 'None reported' }}</td></tr>
            <tr><td class="detail-label">Existing Medical Notes</td><td>{{ $pet->medical_notes ?: 'None recorded' }}</td></tr>
            <tr><td class="detail-label">Attached File</td><td>{{ $attachmentLabel ?: 'No attachment uploaded' }}</td></tr>
        </table>
        @if($record->appointment?->notes)
            <div class="pill-row">
                <span class="pill">Appointment Notes: {{ $record->appointment->notes }}</span>
            </div>
        @endif
    </div>

    <div class="section">
        <div class="section-title">Clinical Assessment / Diagnosis</div>
        <div class="narrative">{!! nl2br(e($record->diagnosis ?: 'No diagnosis recorded.')) !!}</div>
    </div>

    <div class="section">
        <div class="section-title">Treatment / Procedures Performed</div>
        <div class="narrative">{!! nl2br(e($record->treatment ?: 'No treatment details recorded.')) !!}</div>
    </div>

    <table class="two-column">
        <tr>
            <td>
                <div class="box">
                    <div class="section-title">Prescription / Home Care Instructions</div>
                    <div class="narrative">{!! nl2br(e($record->prescription ?: 'No prescription or home care instructions recorded.')) !!}</div>
                </div>
            </td>
            <td>
                <div class="box box-right">
                    <div class="section-title">Laboratory Findings / Diagnostic Results</div>
                    <div class="narrative">{!! nl2br(e($record->lab_results ?: 'No laboratory findings recorded.')) !!}</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="section">
        <div class="section-title">Veterinarian Notes and Recommendations</div>
        <div class="narrative">{!! nl2br(e($record->notes ?: 'No additional clinical notes recorded.')) !!}</div>
    </div>

    @if(count($clinicalDetails) > 0)
        <div class="section">
            <div class="section-title">Additional Clinical Details</div>
            <table class="detail-table">
                @foreach($clinicalDetails as $label => $value)
                    <tr>
                        <td class="detail-label">{{ \Illuminate\Support\Str::title(str_replace('_', ' ', (string) $label)) }}</td>
                        <td>
                            @if(is_array($value))
                                {{ implode(', ', array_filter($value, fn ($item) => filled($item))) }}
                            @else
                                {!! nl2br(e((string) $value)) !!}
                            @endif
                        </td>
                    </tr>
                @endforeach
            </table>
        </div>
    @endif

    <div class="signature-block">
        <div class="signature-line">Attending Veterinarian: {{ $vet?->name ?: '________________________' }}</div>
    </div>

    <div class="footer">
        <div>{{ $clinicName }} | {{ $clinicPhone ?: 'No clinic phone on file' }}{{ $clinicEmail ? ' | ' . $clinicEmail : '' }}</div>
        <div>This document forms part of the patient's veterinary medical history and should be retained for clinical reference.</div>
    </div>
</body>
</html>
