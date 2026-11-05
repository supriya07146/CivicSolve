from rest_framework import serializers


class ProblemEscalationSerializer(serializers.Serializer):
    is_escalated = serializers.BooleanField()