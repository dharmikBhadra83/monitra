import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, companyName, role, employeeCount } = body;

        if (!name || !companyName || !role || !employeeCount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name,
                companyName,
                role,
                employeeCount,
                onboardingCompleted: true,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error: any) {
        console.error('Onboarding error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
