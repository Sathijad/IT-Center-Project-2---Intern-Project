<?php

namespace App\Http\Controllers;

use App\Services\FeedbackService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ExportController extends Controller
{
    public function __construct(
        private FeedbackService $feedbackService
    ) {}

    public function exportCsv(Request $request): Response
    {
        $filters = $request->only(['status', 'category', 'priority', 'start_date', 'end_date']);

        $csv = $this->feedbackService->exportFeedbackCsv($filters);

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="feedback_export_' . date('Y-m-d') . '.csv"',
        ]);
    }
}

