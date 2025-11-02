class LeaveRequest {
  final int id;
  final int userId;
  final int policyId;
  final String status; // 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
  final DateTime startDate;
  final DateTime endDate;
  final String? halfDay; // 'AM' or 'PM'
  final String? reason;
  final int? approvedBy;
  final DateTime? approvedAt;
  final String? rejectionReason;
  final DateTime createdAt;
  final DateTime updatedAt;

  LeaveRequest({
    required this.id,
    required this.userId,
    required this.policyId,
    required this.status,
    required this.startDate,
    required this.endDate,
    this.halfDay,
    this.reason,
    this.approvedBy,
    this.approvedAt,
    this.rejectionReason,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    return LeaveRequest(
      id: json['id'] as int,
      userId: json['userId'] as int,
      policyId: json['policyId'] as int,
      status: json['status'] as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      halfDay: json['halfDay'] as String?,
      reason: json['reason'] as String?,
      approvedBy: json['approvedBy'] as int?,
      approvedAt: json['approvedAt'] != null 
          ? DateTime.parse(json['approvedAt'] as String) 
          : null,
      rejectionReason: json['rejectionReason'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'policyId': policyId,
      'status': status,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'halfDay': halfDay,
      'reason': reason,
      'approvedBy': approvedBy,
      'approvedAt': approvedAt?.toIso8601String(),
      'rejectionReason': rejectionReason,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  double calculateDays() {
    final diff = endDate.difference(startDate).inDays + 1;
    if (halfDay != null) {
      return diff == 1 ? 0.5 : diff - 0.5;
    }
    return diff.toDouble();
  }
}

class LeaveBalance {
  final int policyId;
  final double balanceDays;
  final DateTime? updatedAt;

  LeaveBalance({
    required this.policyId,
    required this.balanceDays,
    this.updatedAt,
  });

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    return LeaveBalance(
      policyId: json['policyId'] as int,
      balanceDays: (json['balanceDays'] as num).toDouble(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }
}

