// Role-Based Access Control Middleware

// Check if user has required role
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }

        next();
    };
};

// Check if user owns the resource or is admin
exports.checkOwnership = (Model) => {
    return async (req, res, next) => {
        try {
            const resource = await Model.findById(req.params.id);

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'
                });
            }

            // Admin can access all resources
            if (req.user.role === 'admin') {
                req.resource = resource;
                return next();
            }

            // Check ownership
            if (resource.owner.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this resource'
                });
            }

            req.resource = resource;
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error checking ownership'
            });
        }
    };
};

// Role hierarchy for permission checks
const roleHierarchy = {
    viewer: 1,
    editor: 2,
    admin: 3
};

// Check if user has minimum role level
exports.hasMinRole = (minRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const userLevel = roleHierarchy[req.user.role] || 0;
        const requiredLevel = roleHierarchy[minRole] || 0;

        if (userLevel < requiredLevel) {
            return res.status(403).json({
                success: false,
                message: `Minimum role '${minRole}' required to access this route`
            });
        }

        next();
    };
};
