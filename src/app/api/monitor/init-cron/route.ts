import { NextResponse } from 'next/server';
import { startPriceUpdateCron } from '@/lib/cron';

// Initialize cron job on server startup
// This should be called once when the server starts
// In production, you might want to call this via a deployment hook or startup script

let cronInitialized = false;

export async function GET() {
  try {
    if (!cronInitialized) {
      startPriceUpdateCron();
      cronInitialized = true;
      return NextResponse.json({ 
        success: true, 
        message: 'Cron job initialized successfully' 
      });
    }
    return NextResponse.json({ 
      success: true, 
      message: 'Cron job already initialized' 
    });
  } catch (error: any) {
    console.error('Error initializing cron job:', error);
    return NextResponse.json(
      { error: 'Failed to initialize cron job', details: error.message },
      { status: 500 }
    );
  }
}
