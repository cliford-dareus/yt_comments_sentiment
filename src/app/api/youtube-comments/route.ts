import { google } from "googleapis";
import { NextResponse } from "next/server";

export  async function POST (req: Request) {
  const { } = req.json();
  
  return NextResponse.json({message: 'RECEIVED'})
}