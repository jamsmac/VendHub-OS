{{/*
Expand the name of the chart.
*/}}
{{- define "vendhub.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "vendhub.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "vendhub.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "vendhub.labels" -}}
helm.sh/chart: {{ include "vendhub.chart" . }}
{{ include "vendhub.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "vendhub.selectorLabels" -}}
app.kubernetes.io/name: {{ include "vendhub.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
API labels
*/}}
{{- define "vendhub.api.labels" -}}
{{ include "vendhub.labels" . }}
app.kubernetes.io/component: api
{{- end }}

{{- define "vendhub.api.selectorLabels" -}}
{{ include "vendhub.selectorLabels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
Web labels
*/}}
{{- define "vendhub.web.labels" -}}
{{ include "vendhub.labels" . }}
app.kubernetes.io/component: web
{{- end }}

{{- define "vendhub.web.selectorLabels" -}}
{{ include "vendhub.selectorLabels" . }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Client labels
*/}}
{{- define "vendhub.client.labels" -}}
{{ include "vendhub.labels" . }}
app.kubernetes.io/component: client
{{- end }}

{{- define "vendhub.client.selectorLabels" -}}
{{ include "vendhub.selectorLabels" . }}
app.kubernetes.io/component: client
{{- end }}

{{/*
Bot labels
*/}}
{{- define "vendhub.bot.labels" -}}
{{ include "vendhub.labels" . }}
app.kubernetes.io/component: bot
{{- end }}

{{- define "vendhub.bot.selectorLabels" -}}
{{ include "vendhub.selectorLabels" . }}
app.kubernetes.io/component: bot
{{- end }}

{{/*
Create the name of the service account
*/}}
{{- define "vendhub.serviceAccountName" -}}
{{- default (include "vendhub.fullname" .) .Values.serviceAccount.name }}
{{- end }}

{{/*
Database URL
*/}}
{{- define "vendhub.databaseUrl" -}}
{{- if .Values.secrets.databaseUrl }}
{{- .Values.secrets.databaseUrl }}
{{- else }}
{{- printf "postgresql://%s:%s@%s-postgresql:5432/%s" .Values.postgresql.auth.username "$(DB_PASSWORD)" .Release.Name .Values.postgresql.auth.database }}
{{- end }}
{{- end }}

{{/*
Redis URL
*/}}
{{- define "vendhub.redisUrl" -}}
{{- printf "redis://:%s@%s-redis-master:6379" "$(REDIS_PASSWORD)" .Release.Name }}
{{- end }}

{{/*
Image pull secrets
*/}}
{{- define "vendhub.imagePullSecrets" -}}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}
