from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from .models import LessonReport
from .serializers import LessonReportSerializer
from apps.users.permissions import IsObserverOrAbove
from apps.analytics.models import ActivityLog
from django.db.models import Avg
from django.db.models.functions import TruncMinute
import csv
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import textwrap
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
import os
from django.conf import settings

try:
    pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
    FONT_NAME = 'Arial'
except Exception:
    FONT_NAME = 'Helvetica'

TRANSLATIONS = {
    'uz': {
        'lesson_report': 'Dars Hisoboti',
        'lesson_title': 'Dars Nomi',
        'date': 'Sana',
        'status': 'Holati',
        'total_students': 'Jami Qatnashuvchilar',
        'active': 'Faollar',
        'moderate': 'O\'rtachalar',
        'passive': 'Sustlar',
        'avg_engagement': 'O\'rtacha Faollik (%)',
        'engagement_summary': 'Faollik Xulosasi',
        'total_participants': 'Jami Qatnashuvchilar',
        'highly_active': 'Juda Faol',
        'moderate_focus': 'O\'rtacha E\'tibor',
        'low_engagement': 'Past E\'tibor',
        'ai_recommendations': 'AI Tavsiyalari',
        'no_summary': 'Xulosa mavjud emas.',
        'student_id_summary': 'Talabalar Aniqlanishi va Holati',
        'thumbnail': 'Rasm',
        'id_name': 'ID / Ism',
        'behavior': 'Hulq-atvor',
        'accuracy': 'Aniqlik',
        'unknown': "Noma'lum",
        'none': 'Mavjud emas',
    },
    'ru': {
        'lesson_report': 'Отчет об уроке',
        'lesson_title': 'Название урока',
        'date': 'Дата',
        'status': 'Статус',
        'total_students': 'Всего студентов',
        'active': 'Активные',
        'moderate': 'Средние',
        'passive': 'Слабые',
        'avg_engagement': 'Средняя вовлеченность (%)',
        'engagement_summary': 'Сводка вовлеченности',
        'total_participants': 'Всего участников',
        'highly_active': 'Высокая активность',
        'moderate_focus': 'Среднее внимание',
        'low_engagement': 'Низкая вовлеченность',
        'ai_recommendations': 'Рекомендации ИИ',
        'no_summary': 'Сводка недоступна.',
        'student_id_summary': 'Идентификация студентов',
        'thumbnail': 'Фото',
        'id_name': 'ID / Имя',
        'behavior': 'Поведение',
        'accuracy': 'Точность',
        'unknown': 'Неизвестно',
        'none': 'Нет данных',
    },
    'en': {
        'lesson_report': 'Lesson Report',
        'lesson_title': 'Lesson Title',
        'date': 'Date',
        'status': 'Status',
        'total_students': 'Total Students',
        'active': 'Active',
        'moderate': 'Moderate',
        'passive': 'Passive',
        'avg_engagement': 'Avg Engagement (%)',
        'engagement_summary': 'Engagement Summary',
        'total_participants': 'Total Participants',
        'highly_active': 'Highly Active',
        'moderate_focus': 'Moderate Focus',
        'low_engagement': 'Low Engagement',
        'ai_recommendations': 'AI Recommendations',
        'no_summary': 'No summary available.',
        'student_id_summary': 'Student Identification & Status',
        'thumbnail': 'Photo',
        'id_name': 'ID / Name',
        'behavior': 'Behavior',
        'accuracy': 'Accuracy',
        'unknown': 'Unknown',
        'none': 'None',
    }
}

class LessonReportView(APIView):
    permission_classes = [IsObserverOrAbove]

    def get(self, request, lesson_id):
        qs = LessonReport.objects.select_related('lesson')
        if request.user.role == 'teacher':
            qs = qs.filter(lesson__teacher=request.user)
            
        try:
            report = qs.get(lesson_id=lesson_id)
        except LessonReport.DoesNotExist:
            return Response({'error': 'Report not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = LessonReportSerializer(report)
        data = serializer.data
        
        # Add lesson detail
        data['lesson_detail'] = {
            'title': report.lesson.title,
            'status': report.lesson.status,
            'start_time': report.lesson.start_time,
            'end_time': report.lesson.end_time,
        }
        
        # Generate timeline history for the chart (grouped by minute)
        timeline = ActivityLog.objects.filter(lesson=report.lesson) \
            .annotate(minute=TruncMinute('timestamp')) \
            .values('minute') \
            .annotate(avg_engagement=Avg('total_engagement_score')) \
            .order_by('minute')
            
        data['timeline_history'] = [
            {
                'timestamp': item['minute'].isoformat() if item['minute'] else report.created_at.isoformat(), 
                'avg_engagement': item['avg_engagement']
            }
            for item in timeline
        ]

        # NEW: Behavior distribution for pie chart
        from django.db.models import Count
        behaviors = ActivityLog.objects.filter(lesson=report.lesson, behavior_label__isnull=False) \
            .values('behavior_label') \
            .annotate(count=Count('id')) \
            .order_by('-count')
        
        data['behavior_distribution'] = {
            item['behavior_label']: item['count'] for item in behaviors
        }
        
        return Response(data)


class LessonReportListView(APIView):
    permission_classes = [IsObserverOrAbove]

    def get(self, request):
        qs = LessonReport.objects.select_related('lesson').order_by('-created_at')
        if request.user.role == 'teacher':
            qs = qs.filter(lesson__teacher=request.user)
            
        serializer = LessonReportSerializer(qs, many=True)
        return Response(serializer.data)


class LessonReportCsvExportView(APIView):
    permission_classes = [IsObserverOrAbove]

    def get(self, request, lesson_id):
        lang = request.GET.get('lang', 'en')
        t = TRANSLATIONS.get(lang, TRANSLATIONS['en'])
        
        try:
            report = LessonReport.objects.select_related('lesson').get(lesson_id=lesson_id)
        except LessonReport.DoesNotExist:
            return Response({'error': 'Report not found.'}, status=404)
        
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig') # Add BOM for Excel UTF-8
        response['Content-Disposition'] = f'attachment; filename="report_{lesson_id}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([t['lesson_title'], t['date'], t['status'], t['total_students'], t['active'], t['moderate'], t['passive'], t['avg_engagement']])
        writer.writerow([
            report.lesson.title,
            report.created_at.strftime('%Y-%m-%d %H:%M'),
            report.lesson.status,
            report.total_students_detected,
            report.active_count,
            report.moderate_count,
            report.passive_count,
            f"{report.avg_engagement:.1f}" if report.avg_engagement else "0"
        ])
        return response


class LessonReportPdfExportView(APIView):
    permission_classes = [IsObserverOrAbove]

    def get(self, request, lesson_id):
        lang = request.GET.get('lang', 'en')
        t = TRANSLATIONS.get(lang, TRANSLATIONS['en'])

        try:
            report = LessonReport.objects.select_related('lesson').get(lesson_id=lesson_id)
        except LessonReport.DoesNotExist:
            return Response({'error': 'Report not found.'}, status=404)
            
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="report_{lesson_id}.pdf"'
        
        doc = SimpleDocTemplate(response, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        
        # Color Palette - EduVision Signature
        EDU_BLUE = colors.HexColor('#2563EB')
        EDU_LIGHT_BLUE = colors.HexColor('#EFF6FF')
        EDU_TEXT = colors.HexColor('#1E293B')
        EDU_GRAY_TEXT = colors.HexColor('#64748B')
        EMERALD_BG = colors.HexColor('#ECFDF5')
        RED_BG = colors.HexColor('#FEF2F2')
        AMBER_BG = colors.HexColor('#FFFBEB')

        # Custom Font Style
        style_title = ParagraphStyle(
            'TitleStyle', parent=styles['Heading1'], fontName=FONT_NAME, 
            fontSize=24, alignment=0, spaceAfter=5, textColor=EDU_BLUE
        )
        style_subtitle = ParagraphStyle(
            'SubTitleStyle', parent=styles['Normal'], fontName=FONT_NAME,
            fontSize=10, textColor=EDU_GRAY_TEXT, spaceAfter=20
        )
        style_h2 = ParagraphStyle(
            'H2Style', parent=styles['Heading2'], fontName=FONT_NAME, 
            fontSize=16, spaceBefore=20, spaceAfter=12, textColor=EDU_TEXT
        )
        style_text = ParagraphStyle(
            'TextStyle', parent=styles['Normal'], fontName=FONT_NAME, 
            fontSize=11, leading=16, textColor=EDU_TEXT
        )
        style_center = ParagraphStyle(
            'CenterStyle', parent=styles['Normal'], fontName=FONT_NAME, 
            fontSize=10, alignment=1, textColor=EDU_TEXT
        )

        story = []

        # Header - Signature EduVision
        story.append(Paragraph(f"<b>EduVision Classroom Analytics</b>", style_title))
        story.append(Paragraph(f"{t['lesson_report']} #{report.id} • {report.created_at.strftime('%Y-%m-%d %H:%M')}", style_subtitle))
        story.append(Paragraph(f"<b>{t['lesson_title']}:</b> {report.lesson.title}", style_text))
        story.append(Spacer(1, 20))

        # Stats Dashboard Grid
        story.append(Paragraph(t['engagement_summary'], style_h2))
        
        # Helper for styling stat cells
        def stat_cell(value, label, val_color, lab_color):
            return Paragraph(f"<font color='{val_color}' size='20'><b>{value}</b></font><br/><font color='{lab_color}' size='9'>{label.upper()}</font>", style_center)

        avg_eng_str = f"{report.avg_engagement:.1f}%" if report.avg_engagement else "0%"

        stat_data = [
            [
                stat_cell(report.active_count, t['highly_active'], '#059669', '#059669'),
                stat_cell(report.moderate_count, t['moderate_focus'], '#D97706', '#D97706'),
                stat_cell(report.passive_count, t['low_engagement'], '#DC2626', '#DC2626')
            ],
            [
                stat_cell(avg_eng_str, t['avg_engagement'].replace(' (%)', ''), '#2563EB', '#2563EB'),
                stat_cell(report.total_students_detected, t['total_participants'], '#475569', '#475569'),
                ""
            ]
        ]
        
        stat_table = Table(stat_data, colWidths=[175, 175, 175])
        stat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), EMERALD_BG),
            ('BACKGROUND', (1, 0), (1, 0), AMBER_BG),
            ('BACKGROUND', (2, 0), (2, 0), RED_BG),
            ('BACKGROUND', (0, 1), (0, 1), EDU_LIGHT_BLUE),
            ('BACKGROUND', (1, 1), (1, 1), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 15),
            ('TOPPADDING', (0,0), (-1,-1), 15),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 2, colors.white),
        ]))
        story.append(stat_table)
        story.append(Spacer(1, 15))

        # AI Summary
        story.append(Paragraph(t['ai_recommendations'], style_h2))
        ai_text = report.summary or t['no_summary']
        ai_p = Paragraph(f"<font color='#1E3A8A'>{ai_text}</font>", style_text)
        
        ai_table = Table([[ai_p]], colWidths=[525])
        ai_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), EDU_LIGHT_BLUE),
            ('BOX', (0,0), (-1,-1), 0.5, EDU_BLUE),
            ('TOPPADDING', (0,0), (0,0), 15),
            ('BOTTOMPADDING', (0,0), (0,0), 15),
            ('LEFTPADDING', (0,0), (0,0), 15),
            ('RIGHTPADDING', (0,0), (0,0), 15),
        ]))
        story.append(ai_table)
        story.append(Spacer(1, 25))

        # Student Identification Table
        story.append(Paragraph(t['student_id_summary'], style_h2))
        
        student_logs = ActivityLog.objects.filter(lesson=report.lesson, face_screenshot__isnull=False) \
            .exclude(face_screenshot='') \
            .values('student', 'temp_student_id', 'behavior_label', 'confidence_score', 'face_screenshot') \
            .order_by('student', '-confidence_score')
            
        unique_students = {}
        for log in student_logs:
            uid = log['student'] if log['student'] else log['temp_student_id']
            if uid not in unique_students:
                unique_students[uid] = log

        th_style = ParagraphStyle('TH', parent=styles['Normal'], fontName=FONT_NAME, fontSize=10, textColor=colors.white, alignment=1)
        td_style = ParagraphStyle('TD', parent=styles['Normal'], fontName=FONT_NAME, fontSize=10, textColor=EDU_TEXT, alignment=1)

        table_data = [[
            Paragraph(f"<b>{t['thumbnail']}</b>", th_style), 
            Paragraph(f"<b>{t['id_name']}</b>", th_style), 
            Paragraph(f"<b>{t['behavior']}</b>", th_style), 
            Paragraph(f"<b>{t['accuracy']}</b>", th_style)
        ]]
        
        for uid, log in unique_students.items():
            img = "N/A"
            if log['face_screenshot']:
                img_path = os.path.join(settings.MEDIA_ROOT, str(log['face_screenshot']))
                if os.path.isfile(img_path):
                    try:
                        img = Image(img_path, width=40, height=40)
                    except Exception:
                        pass

            name = "Unknown Student"
            if log['student']:
                from apps.users.models import Student
                s = Student.objects.filter(id=log['student']).first()
                if s: name = f"{s.first_name} {s.last_name}"
            elif log['temp_student_id']:
                name = f"ID: {log['temp_student_id'][:8]}"

            table_data.append([
                img,
                Paragraph(name, td_style),
                Paragraph(log['behavior_label'] or t.get('none', '--'), td_style),
                Paragraph(f"{log['confidence_score']:.1f}%" if log['confidence_score'] else t.get('unknown', "Noma'lum"), td_style)
            ])

        if len(table_data) > 1:
            tbl = Table(table_data, colWidths=[75, 200, 150, 100], repeatRows=1)
            tbl.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), EDU_BLUE),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.whitesmoke]),
            ]))
            story.append(tbl)
        else:
            story.append(Paragraph(t.get('no_summary', "No student identification data found."), style_text))

        doc.build(story)
        return response
