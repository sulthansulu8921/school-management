import os
import shutil
from datetime import datetime
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import FileResponse, Http404
from .models import SchoolSettings, Backup
from .serializers import SchoolSettingsSerializer, BackupSerializer

class BackupListCreateAPIView(APIView):
    def get(self, request):
        backups = Backup.objects.all().order_by('-created_at')
        serializer = BackupSerializer(backups, many=True)
        return Response(serializer.data)

    def post(self, request):
        try:
            db_path = settings.DATABASES['default']['NAME']
            # Robust path management for Electron/Local
            backup_dir = os.path.join(settings.BASE_DIR, 'backups')
            
            if not os.path.exists(backup_dir):
                os.makedirs(backup_dir)
                
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"backup_{timestamp}.sqlite3"
            backup_path = os.path.join(backup_dir, backup_filename)
            
            # Use copy2 to preserve metadata
            shutil.copy2(db_path, backup_path)
            
            # Store metadata in DB
            file_size = os.path.getsize(backup_path)
            backup_record = Backup.objects.create(
                file_name=backup_filename,
                file_path=backup_path,
                file_size=file_size,
                status="Success"
            )
            
            serializer = BackupSerializer(backup_record)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Optionally record failure
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BackupDownloadAPIView(APIView):
    def get(self, request, pk):
        try:
            backup = Backup.objects.get(pk=pk)
            if os.path.exists(backup.file_path):
                return FileResponse(
                    open(backup.file_path, 'rb'), 
                    as_attachment=True, 
                    filename=backup.file_name
                )
            else:
                return Response({'error': 'File not found on disk'}, status=status.HTTP_404_NOT_FOUND)
        except Backup.DoesNotExist:
            raise Http404
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SettingsView(APIView):
    def get(self, request):
        settings_obj = SchoolSettings.objects.first()
        if not settings_obj:
            settings_obj = SchoolSettings.objects.create()
        serializer = SchoolSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def put(self, request):
        settings_obj = SchoolSettings.objects.first()
        if not settings_obj:
            settings_obj = SchoolSettings.objects.create()
        serializer = SchoolSettingsSerializer(settings_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
