class UserProfile {
  final int id;
  final String email;
  String displayName;
  String locale;
  final List<String> roles;

  UserProfile({
    required this.id,
    required this.email,
    required this.displayName,
    required this.locale,
    required this.roles,
  });

  factory UserProfile.fromJson(Map<String, dynamic> j) => UserProfile(
        id: j['id'] as int,
        email: j['email'] as String,
        displayName: (j['displayName'] ?? '') as String,
        locale: (j['locale'] ?? 'en') as String,
        roles: ((j['roles'] ?? []) as List).map((e) => e.toString()).toList(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'displayName': displayName,
        'locale': locale,
        'roles': roles,
      };
}

